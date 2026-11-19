import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appStorage } from "../lib/storage";
import * as engine from "../lib/timerEngine";
import type { CompletedPhase, Phase, TimerState } from "../lib/timerEngine";
import { DEFAULT_SETTINGS, timerConfigOf, useSettings } from "./settings";
import { useTasks } from "./tasks";
import { useHistory } from "./history";
import { audio } from "../lib/audio";
import { notify } from "../lib/notify";

export interface PhaseEvent {
  id: number;
  finished: Phase;
  next: Phase;
  at: number;
}

interface TimerStore extends TimerState {
  now: number;
  lastEvent: PhaseEvent | null;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  resetCycle: () => void;
  skip: () => void;
  tick: () => void;
  syncConfig: () => void;
}

const cfg = () => timerConfigOf(useSettings.getState());
const pick = (s: TimerState): TimerState => ({
  phase: s.phase,
  status: s.status,
  endsAt: s.endsAt,
  remainingMs: s.remainingMs,
  phaseDurationMs: s.phaseDurationMs,
  cycleCount: s.cycleCount,
});

let eventId = 0;

function settle(completed: CompletedPhase[], next: Phase): PhaseEvent | null {
  if (completed.length === 0) return null;
  const settings = useSettings.getState();
  const tasks = useTasks.getState();
  for (const c of completed) {
    if (c.phase !== "focus") continue;
    const task = tasks.tasks.find((t) => t.id === tasks.currentTaskId && !t.done) ?? null;
    useHistory.getState().addSession({
      endedAt: c.endedAt,
      durationMs: c.durationMs,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? null,
      scene: settings.scene,
    });
    if (task) tasks.creditPomodoro(task.id);
  }
  const last = completed[completed.length - 1];
  // Only make noise for something that just happened, not for phases settled after a long sleep.
  const fresh = Date.now() - last.endedAt < 90_000;
  if (fresh) {
    if (settings.sound) audio.play(last.phase === "focus" ? "focusEnd" : "breakEnd");
    if (settings.notifications) {
      const task = useTasks.getState().tasks.find((t) => t.id === useTasks.getState().currentTaskId);
      const auto = settings.autoAdvance;
      if (last.phase === "focus") {
        const long = next === "longBreak";
        notify(
          long ? "Quest complete! Long break time" : "Focus complete!",
          `${task ? `+1 pomodoro for "${task.title}". ` : ""}${auto ? "Your" : "Start your"} ${
            long ? `${settings.longBreakMin}-minute long` : `${settings.shortBreakMin}-minute`
          } break${auto ? " has begun." : " when you're ready."}`,
        );
      } else {
        notify("Break's over", auto ? "Back to it! A new focus session has started." : "Ready for another focus session?");
      }
    }
  }
  return { id: ++eventId, finished: last.phase, next, at: Date.now() };
}

export const useTimer = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...engine.createTimer(timerConfigOf(DEFAULT_SETTINGS)),
      now: Date.now(),
      lastEvent: null,
      start: () => {
        const now = Date.now();
        set({ ...engine.start(pick(get()), now), now });
      },
      pause: () => {
        const now = Date.now();
        set({ ...engine.pause(pick(get()), now), now });
      },
      toggle: () => (get().status === "running" ? get().pause() : get().start()),
      reset: () => set({ ...engine.reset(pick(get()), cfg()), now: Date.now() }),
      resetCycle: () => set({ ...engine.resetCycle(cfg()), now: Date.now() }),
      skip: () => {
        const now = Date.now();
        set({ ...engine.skip(pick(get()), cfg(), now), now });
      },
      tick: () => {
        const now = Date.now();
        const { state, completed } = engine.advance(pick(get()), cfg(), now);
        if (completed.length === 0) {
          set({ now });
          return;
        }
        const ev = settle(completed, state.phase);
        set({ ...state, now, lastEvent: ev ?? get().lastEvent });
      },
      syncConfig: () => {
        const current = pick(get());
        const next = engine.applyConfig(current, cfg());
        if (next !== current) set(next);
      },
    }),
    {
      name: "timer",
      version: 1,
      storage: appStorage,
      partialize: (s) => pick(s),
    },
  ),
);
