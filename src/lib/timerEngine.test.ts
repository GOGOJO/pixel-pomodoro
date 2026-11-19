import { describe, expect, it } from "vitest";
import {
  MINUTE,
  advance,
  applyConfig,
  createTimer,
  formatClock,
  getRemaining,
  pause,
  reset,
  skip,
  start,
  type TimerConfig,
} from "./timerEngine";

const cfg: TimerConfig = { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakInterval: 4, autoAdvance: true };
const manual: TimerConfig = { ...cfg, autoAdvance: false };
const T0 = 1_700_000_000_000;

describe("timer engine", () => {
  it("starts with a 25 minute idle focus session", () => {
    const s = createTimer(cfg);
    expect(s.phase).toBe("focus");
    expect(s.status).toBe("idle");
    expect(getRemaining(s, T0)).toBe(25 * MINUTE);
    expect(formatClock(getRemaining(s, T0))).toBe("25:00");
  });

  it("derives remaining time from wall-clock timestamps", () => {
    const s = start(createTimer(cfg), T0);
    expect(getRemaining(s, T0 + 1234)).toBe(25 * MINUTE - 1234);
    // A throttled or sleeping UI that only checks back much later still reads the right value.
    expect(getRemaining(s, T0 + 17 * MINUTE + 30_000)).toBe(7 * MINUTE + 30_000);
    expect(formatClock(getRemaining(s, T0 + 17 * MINUTE + 30_000))).toBe("07:30");
  });

  it("rounds the display up so 00:00 only shows at the end", () => {
    expect(formatClock(59_001)).toBe("01:00");
    expect(formatClock(1)).toBe("00:01");
    expect(formatClock(0)).toBe("00:00");
  });

  it("pauses and resumes without losing or gaining time", () => {
    let s = start(createTimer(cfg), T0);
    s = pause(s, T0 + 10 * MINUTE);
    expect(s.status).toBe("paused");
    expect(getRemaining(s, T0 + 60 * MINUTE)).toBe(15 * MINUTE);
    s = start(s, T0 + 60 * MINUTE);
    expect(getRemaining(s, T0 + 65 * MINUTE)).toBe(10 * MINUTE);
  });

  it("reset restores the full duration of the current phase", () => {
    let s = start(createTimer(cfg), T0);
    s = reset(s, cfg);
    expect(s.status).toBe("idle");
    expect(getRemaining(s, T0 + MINUTE)).toBe(25 * MINUTE);
  });

  it("auto-advances from focus to a short break at the exact end time", () => {
    const s = start(createTimer(cfg), T0);
    const r = advance(s, cfg, T0 + 25 * MINUTE + 3000);
    expect(r.completed).toEqual([{ phase: "focus", durationMs: 25 * MINUTE, endedAt: T0 + 25 * MINUTE }]);
    expect(r.state.phase).toBe("shortBreak");
    expect(r.state.status).toBe("running");
    expect(getRemaining(r.state, T0 + 25 * MINUTE + 3000)).toBe(5 * MINUTE - 3000);
  });

  it("waits for the user in manual mode", () => {
    const s = start(createTimer(manual), T0);
    const r = advance(s, manual, T0 + 26 * MINUTE);
    expect(r.completed).toHaveLength(1);
    expect(r.state.phase).toBe("shortBreak");
    expect(r.state.status).toBe("idle");
    expect(getRemaining(r.state, T0 + 90 * MINUTE)).toBe(5 * MINUTE);
  });

  it("takes a long break after every fourth focus session", () => {
    let s = start(createTimer(cfg), T0);
    const phases: string[] = [];
    let now = T0;
    for (let i = 0; i < 9; i++) {
      now = s.endsAt!;
      const r = advance(s, cfg, now);
      phases.push(r.state.phase);
      s = r.state;
    }
    expect(phases).toEqual([
      "shortBreak", "focus", "shortBreak", "focus", "shortBreak", "focus", "longBreak", "focus", "shortBreak",
    ]);
  });

  it("catches up on several phases after a long sleep", () => {
    const s = start(createTimer(cfg), T0);
    const r = advance(s, cfg, T0 + 25 * MINUTE + 5 * MINUTE + 25 * MINUTE + 60_000);
    expect(r.completed.map((c) => c.phase)).toEqual(["focus", "shortBreak", "focus"]);
    expect(r.state.phase).toBe("shortBreak");
    expect(getRemaining(r.state, T0 + 56 * MINUTE)).toBe(4 * MINUTE);
  });

  it("does nothing before the end time", () => {
    const s = start(createTimer(cfg), T0);
    const r = advance(s, cfg, T0 + 25 * MINUTE - 1);
    expect(r.completed).toHaveLength(0);
    expect(r.state).toBe(s);
  });

  it("skipping a focus session does not count toward the long break", () => {
    let s = start(createTimer(cfg), T0);
    s = skip(s, cfg, T0 + MINUTE);
    expect(s.phase).toBe("shortBreak");
    expect(s.cycleCount).toBe(0);
    expect(s.status).toBe("running");
    s = skip(s, cfg, T0 + 2 * MINUTE);
    expect(s.phase).toBe("focus");
  });

  it("skip leaves the timer idle in manual mode", () => {
    const s = skip(start(createTimer(manual), T0), manual, T0 + 1000);
    expect(s.status).toBe("idle");
  });

  it("applies new durations only to phases that have not started", () => {
    const idle = createTimer(cfg);
    const changed = { ...cfg, focusMin: 50 };
    expect(getRemaining(applyConfig(idle, changed), T0)).toBe(50 * MINUTE);
    const running = start(idle, T0);
    expect(applyConfig(running, changed)).toBe(running);
  });
});
