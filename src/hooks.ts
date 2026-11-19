import { useEffect, useState } from "react";
import { useSettings } from "./store/settings";
import { useTasks } from "./store/tasks";
import { useHistory } from "./store/history";
import { useTimer } from "./store/timer";
import { timeOfDayFor } from "./scenes/renderer";
import type { Activity, TimeOfDay } from "./scenes/pixel";

const persisted = [useSettings, useTasks, useHistory, useTimer] as const;

export function useHydrated() {
  const [ready, setReady] = useState(() => persisted.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (persisted.every((s) => s.persist.hasHydrated())) setReady(true);
    };
    const unsubs = persisted.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}

/** Keeps the timer settled against the wall clock. Runs even when nothing is on screen. */
export function useTimerDriver(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const { tick, syncConfig } = useTimer.getState();
    syncConfig();
    tick();
    const id = window.setInterval(() => useTimer.getState().tick(), 250);
    const wake = () => useTimer.getState().tick();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    const unsub = useSettings.subscribe((s, prev) => {
      if (
        s.focusMin !== prev.focusMin ||
        s.shortBreakMin !== prev.shortBreakMin ||
        s.longBreakMin !== prev.longBreakMin
      )
        useTimer.getState().syncConfig();
    });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      unsub();
    };
  }, [enabled]);
}

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useResolvedTheme(): "light" | "dark" {
  const appearance = useSettings((s) => s.appearance);
  const [sysDark, setSysDark] = useState(systemDark);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const theme = appearance === "system" ? (sysDark ? "dark" : "light") : appearance;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return theme;
}

export function useClock(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useTimeOfDay(): TimeOfDay {
  const lighting = useSettings((s) => s.lighting);
  const now = useClock();
  return lighting === "auto" ? timeOfDayFor(now) : lighting;
}

export function useActivity(): Activity {
  const phase = useTimer((s) => s.phase);
  const status = useTimer((s) => s.status);
  if (status === "paused") return "paused";
  if (status === "idle") return "idle";
  if (phase === "focus") return "focus";
  return phase === "longBreak" ? "longBreak" : "break";
}

export function useShortcuts(handlers: Record<string, (e: KeyboardEvent) => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const combo = `${e.metaKey || e.ctrlKey ? "mod+" : ""}${e.key.toLowerCase()}`;
      const fn = handlers[combo];
      if (!fn) return;
      if (typing && !combo.startsWith("mod+") && combo !== "escape") return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
