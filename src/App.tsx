import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PixelEnvironment } from "./components/PixelEnvironment";
import { PomodoroTimer, useTimerActions } from "./components/PomodoroTimer";
import { TaskManager } from "./components/TaskManager";
import { SessionTracker } from "./components/SessionTracker";
import { SettingsPanel } from "./components/SettingsPanel";
import { SceneSelector, useSceneUnlocks } from "./components/SceneSelector";
import { AudioManager } from "./components/AudioManager";
import { PixelIcon } from "./components/PixelIcon";
import { useActivity, useClock, useHydrated, useResolvedTheme, useShortcuts, useTimeOfDay, useTimerDriver } from "./hooks";
import { useSettings } from "./store/settings";
import { useTimer, type PhaseEvent } from "./store/timer";
import { lastNDays, useHistory } from "./store/history";
import { SCENES, SCENE_ORDER } from "./scenes";
import { formatClock, getRemaining, PHASE_LABEL } from "./lib/timerEngine";
import { isMac, isTauri } from "./lib/platform";
import { W, H } from "./scenes/pixel";

const NARROW = 920;

function TopBar({
  onSettings,
  onScenes,
  sidebarOpen,
  onToggleSidebar,
}: {
  onSettings: () => void;
  onScenes: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const now = useClock(60_000);
  const date = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const inset = isTauri && isMac;
  return (
    <header
      data-tauri-drag-region
      className="drag-region flex h-[52px] flex-none items-center justify-between pr-3"
      style={{ paddingLeft: inset ? 84 : 14, background: "var(--panel)", boxShadow: "inset 0 -3px 0 0 var(--border)" }}
    >
      <div data-tauri-drag-region className="flex items-center gap-3">
        <PixelIcon name="tomato" size={20} />
        <h1 data-tauri-drag-region className="font-pixel m-0 text-[11px] tracking-wide" style={{ color: "var(--text)" }}>
          PIXEL POMODORO
        </h1>
        <span data-tauri-drag-region className="text-[18px]" style={{ color: "var(--muted)" }}>
          {date}
        </span>
      </div>
      <nav className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button className="px-btn-ghost flex items-center gap-2 border-0 px-2 text-[18px]" onClick={onScenes} title="Choose a world">
          <PixelIcon name="scene" size={16} />
          <span className="hidden sm:inline">Worlds</span>
        </button>
        <button
          className="px-btn-ghost flex items-center gap-2 border-0 px-2 text-[18px]"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          title="Toggle quest log & stats"
        >
          <PixelIcon name="sidebar" size={16} />
          <span className="hidden sm:inline">Quests</span>
        </button>
        <button className="px-btn-ghost border-0 px-2" onClick={onSettings} title="Settings (⌘,)" aria-label="Settings">
          <PixelIcon name="gear" size={18} />
        </button>
      </nav>
    </header>
  );
}

const TOAST_TEXT: Record<string, [string, string]> = {
  "focus>shortBreak": ["Focus complete!", "Take a short breather."],
  "focus>longBreak": ["Cycle complete!", "Enjoy a long break."],
  "shortBreak>focus": ["Break's over", "Ready for the next quest?"],
  "longBreak>focus": ["Fully rested", "A fresh cycle begins."],
};

function PhaseToast() {
  const ev = useTimer((s) => s.lastEvent);
  const [shown, setShown] = useState<PhaseEvent | null>(null);
  useEffect(() => {
    if (!ev || Date.now() - ev.at > 10_000) return;
    setShown(ev);
    const id = window.setTimeout(() => setShown(null), 6000);
    return () => window.clearTimeout(id);
  }, [ev]);
  if (!shown) return null;
  const [title, body] = TOAST_TEXT[`${shown.finished}>${shown.next}`] ?? ["Session complete", ""];
  return (
    <div
      key={shown.id}
      data-phase={shown.next}
      className="px-panel anim-pop absolute left-1/2 flex -translate-x-1/2 items-center gap-3 px-4 py-2"
      style={{ bottom: "calc(var(--s) * 6px)" }}
      role="status"
    >
      <PixelIcon name={shown.finished === "focus" ? "tomato" : "star"} size={22} className="anim-bob text-[var(--accent)]" />
      <div className="flex flex-col">
        <span className="font-pixel text-[10px]" style={{ color: "var(--phase)" }}>
          {title}
        </span>
        <span className="text-[18px]">{body}</span>
      </div>
      <button className="px-btn-ghost ml-1 border-0" onClick={() => setShown(null)} aria-label="Dismiss">
        <PixelIcon name="close" size={12} />
      </button>
    </div>
  );
}

function Stage() {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: W * 2, h: H * 2 });
  const scene = useSettings((s) => s.scene);
  const tod = useTimeOfDay();
  const activity = useActivity();

  useLayoutEffect(() => {
    const el = box.current!;
    const fit = () => {
      const pad = 22;
      const aw = Math.max(100, el.clientWidth - pad * 2);
      const ah = Math.max(60, el.clientHeight - pad * 2);
      const w = Math.min(aw, (ah * W) / H);
      setSize({ w: Math.floor(w), h: Math.floor((w * H) / W) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = size.w / W;
  return (
    <div ref={box} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
      <div
        className="relative"
        style={{
          width: size.w,
          height: size.h,
          ["--s" as string]: s,
          boxShadow: "0 0 0 4px var(--border), 0 0 0 8px var(--panel-3), 0 0 0 11px var(--border), 0 14px 0 6px rgba(0,0,0,.18)",
        }}
      >
        <PixelEnvironment sceneId={scene} tod={tod} activity={activity} />
        <div className="absolute inset-x-0 flex justify-center" style={{ top: "calc(var(--s) * 7px)" }}>
          <PomodoroTimer />
        </div>
        <PhaseToast />
      </div>
    </div>
  );
}

function BottomBar({ onScenes }: { onScenes: () => void }) {
  const cycle = useTimer((s) => s.cycleCount);
  const phase = useTimer((s) => s.phase);
  const interval = useSettings((s) => s.longBreakInterval);
  const scene = useSettings((s) => s.scene);
  const sessions = useHistory((s) => s.sessions);
  const now = useClock(60_000);
  const tod = useTimeOfDay();
  const today = useMemo(() => lastNDays(sessions, 1, now.getTime())[0].count, [sessions, now]);
  return (
    <footer
      className="flex h-[50px] flex-none items-center justify-between gap-4 px-4"
      style={{ background: "var(--panel)", boxShadow: "inset 0 3px 0 0 var(--border)" }}
    >
      <div className="flex items-center gap-3" title={`Long break after ${interval} focus sessions`}>
        <span className="font-pixel text-[8px]" style={{ color: "var(--muted)" }}>
          CYCLE
        </span>
        <div className="flex items-center gap-[6px]">
          {Array.from({ length: interval }, (_, i) => {
            const done = i < cycle;
            const currentSlot = phase === "focus" && i === cycle;
            return (
              <PixelIcon
                key={i}
                name={done ? "tomato" : "tomatoEmpty"}
                size={18}
                className={currentSlot ? "anim-bob text-[var(--accent)]" : done ? undefined : "text-[var(--faint)]"}
              />
            );
          })}
        </div>
        {phase === "longBreak" && (
          <span className="text-[17px]" style={{ color: "var(--long)" }}>
            long break!
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[18px]">
        <PixelIcon name="tomato" size={14} />
        <span className="font-pixel text-[10px]">{today}</span>
        <span style={{ color: "var(--muted)" }}>completed today</span>
      </div>
      <button className="px-btn-ghost flex items-center gap-2 border-0 px-2 text-[18px]" onClick={onScenes} title="Choose a world">
        <PixelIcon name={tod === "day" ? "sun" : "moon"} size={14} className="text-[var(--accent)]" />
        {SCENES[scene].name}
      </button>
    </footer>
  );
}

function Sidebar({ taskInput, overlay }: { taskInput: React.RefObject<HTMLInputElement | null>; overlay: boolean }) {
  return (
    <aside
      className={`anim-slide-in scrollbar-px flex w-[300px] flex-none flex-col gap-5 overflow-y-auto p-4 ${overlay ? "absolute top-0 right-0 bottom-0 z-30" : ""}`}
      style={{ background: "var(--panel)", boxShadow: "inset 3px 0 0 0 var(--border)" }}
    >
      <div className="flex min-h-[200px] flex-1 flex-col">
        <TaskManager ref={taskInput} />
      </div>
      <SessionTracker />
    </aside>
  );
}

function useDocumentTitle() {
  const label = useTimer((s) => (s.status === "running" ? `${formatClock(getRemaining(s, s.now))} · ${PHASE_LABEL[s.phase]}` : ""));
  useEffect(() => {
    document.title = label ? `${label} — Pixel Pomodoro` : "Pixel Pomodoro";
  }, [label]);
}

function Main() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);
  const [width, setWidth] = useState(() => window.innerWidth);
  const showSidebar = useSettings((s) => s.showSidebar);
  const taskInput = useRef<HTMLInputElement | null>(null);
  const actions = useTimerActions();
  const isUnlocked = useSceneUnlocks();
  useDocumentTitle();

  useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const narrow = width < NARROW;
  // Wide windows dock the sidebar (remembered); narrow ones use a drawer that starts closed.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarOpen = narrow ? drawerOpen : showSidebar;
  const setSidebar = useCallback(
    (open: boolean) => (narrow ? setDrawerOpen(open) : useSettings.getState().update({ showSidebar: open })),
    [narrow],
  );

  const anyModal = settingsOpen || scenesOpen;
  const shortcuts = useMemo(() => {
    if (anyModal) return {};
    const map: Record<string, () => void> = {
      " ": actions.toggle,
      r: actions.reset,
      s: actions.skip,
      t: () => {
        setSidebar(true);
        setTimeout(() => taskInput.current?.focus(), 30);
      },
      "mod+,": () => setSettingsOpen(true),
    };
    SCENE_ORDER.forEach((id, i) => {
      map[String(i + 1)] = () => isUnlocked(id) && useSettings.getState().update({ scene: id });
    });
    return map;
  }, [actions, anyModal, isUnlocked, setSidebar]);
  useShortcuts(shortcuts);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeScenes = useCallback(() => setScenesOpen(false), []);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onSettings={() => setSettingsOpen(true)}
        onScenes={() => setScenesOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebar(!sidebarOpen)}
      />
      <div className="relative flex min-h-0 flex-1">
        <Stage />
        {sidebarOpen && narrow && (
          <div
            className="anim-fade absolute inset-0 z-20"
            style={{ background: "rgba(10,6,16,.5)" }}
            onClick={() => setDrawerOpen(false)}
          />
        )}
        {sidebarOpen && <Sidebar taskInput={taskInput} overlay={narrow} />}
      </div>
      <BottomBar onScenes={() => setScenesOpen(true)} />
      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      <SceneSelector open={scenesOpen} onClose={closeScenes} />
    </div>
  );
}

export default function App() {
  const ready = useHydrated();
  useResolvedTheme();
  useTimerDriver(ready);
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-pixel anim-blink text-[11px]" style={{ color: "var(--muted)" }}>
          LOADING...
        </span>
      </div>
    );
  }
  return (
    <>
      <AudioManager />
      <Main />
    </>
  );
}
