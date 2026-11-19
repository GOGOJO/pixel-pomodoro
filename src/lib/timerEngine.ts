export type Phase = "focus" | "shortBreak" | "longBreak";
export type Status = "idle" | "running" | "paused";

export interface TimerConfig {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakInterval: number;
  autoAdvance: boolean;
}

export interface TimerState {
  phase: Phase;
  status: Status;
  /** Wall-clock time (epoch ms) at which the running phase ends. Only set while running. */
  endsAt: number | null;
  /** Remaining time while idle or paused. */
  remainingMs: number;
  /** Full length of the current phase, used for progress. */
  phaseDurationMs: number;
  /** Focus sessions completed in the current long-break cycle. */
  cycleCount: number;
}

export interface CompletedPhase {
  phase: Phase;
  durationMs: number;
  endedAt: number;
}

export const MINUTE = 60_000;

export function phaseDuration(phase: Phase, cfg: TimerConfig): number {
  const min =
    phase === "focus" ? cfg.focusMin : phase === "shortBreak" ? cfg.shortBreakMin : cfg.longBreakMin;
  return Math.max(1, Math.round(min * MINUTE));
}

export function createTimer(cfg: TimerConfig): TimerState {
  const d = phaseDuration("focus", cfg);
  return { phase: "focus", status: "idle", endsAt: null, remainingMs: d, phaseDurationMs: d, cycleCount: 0 };
}

export function getRemaining(s: TimerState, now: number): number {
  if (s.status === "running" && s.endsAt !== null) return Math.max(0, s.endsAt - now);
  return Math.max(0, s.remainingMs);
}

export function getProgress(s: TimerState, now: number): number {
  if (s.phaseDurationMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - getRemaining(s, now) / s.phaseDurationMs));
}

export function start(s: TimerState, now: number): TimerState {
  if (s.status === "running") return s;
  return { ...s, status: "running", endsAt: now + s.remainingMs };
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== "running") return s;
  return { ...s, status: "paused", endsAt: null, remainingMs: getRemaining(s, now) };
}

/** Restarts the current phase from its full duration without starting it. */
export function reset(s: TimerState, cfg: TimerConfig): TimerState {
  const d = phaseDuration(s.phase, cfg);
  return { ...s, status: "idle", endsAt: null, remainingMs: d, phaseDurationMs: d };
}

/** Resets the whole cycle back to the first focus session. */
export function resetCycle(cfg: TimerConfig): TimerState {
  return createTimer(cfg);
}

function nextAfter(s: TimerState, cfg: TimerConfig, completedFocus: boolean): { phase: Phase; cycleCount: number } {
  if (s.phase === "focus") {
    const count = completedFocus ? s.cycleCount + 1 : s.cycleCount;
    const interval = Math.max(1, Math.round(cfg.longBreakInterval));
    if (completedFocus && count >= interval) return { phase: "longBreak", cycleCount: count };
    return { phase: "shortBreak", cycleCount: count };
  }
  return { phase: "focus", cycleCount: s.phase === "longBreak" ? 0 : s.cycleCount };
}

function enterPhase(
  s: TimerState,
  cfg: TimerConfig,
  next: { phase: Phase; cycleCount: number },
  run: boolean,
  startAt: number,
): TimerState {
  const d = phaseDuration(next.phase, cfg);
  return {
    phase: next.phase,
    cycleCount: next.cycleCount,
    phaseDurationMs: d,
    remainingMs: d,
    status: run ? "running" : "idle",
    endsAt: run ? startAt + d : null,
  };
}

/** Moves to the next phase without counting the current one as completed. */
export function skip(s: TimerState, cfg: TimerConfig, now: number): TimerState {
  const keepRunning = s.status === "running" && cfg.autoAdvance;
  return enterPhase(s, cfg, nextAfter(s, cfg, false), keepRunning, now);
}

/**
 * Settles every phase that has finished by `now`. With auto-advance, the next phase starts at
 * the exact moment the previous one ended, so time spent asleep or minimized is accounted for.
 */
export function advance(
  s: TimerState,
  cfg: TimerConfig,
  now: number,
): { state: TimerState; completed: CompletedPhase[] } {
  const completed: CompletedPhase[] = [];
  let cur = s;
  for (let i = 0; i < 64 && cur.status === "running" && cur.endsAt !== null && cur.endsAt <= now; i++) {
    const endedAt = cur.endsAt;
    completed.push({ phase: cur.phase, durationMs: cur.phaseDurationMs, endedAt });
    cur = enterPhase(cur, cfg, nextAfter(cur, cfg, true), cfg.autoAdvance, endedAt);
  }
  return { state: cur, completed };
}

/** Applies changed durations to a phase that hasn't started yet. */
export function applyConfig(s: TimerState, cfg: TimerConfig): TimerState {
  if (s.status !== "idle") return s;
  const d = phaseDuration(s.phase, cfg);
  if (d === s.phaseDurationMs && d === s.remainingMs) return s;
  return { ...s, remainingMs: d, phaseDurationMs: d };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};
