import { useTimer } from "../store/timer";
import { useTasks } from "../store/tasks";
import { useSettings, timerConfigOf } from "../store/settings";
import { formatClock, getProgress, getRemaining, PHASE_LABEL, phaseDuration, type Phase } from "../lib/timerEngine";
import { audio } from "../lib/audio";
import { ensureNotificationPermission } from "../lib/notify";
import { PixelIcon } from "./PixelIcon";

const PHASES: Phase[] = ["focus", "shortBreak", "longBreak"];
const SHORT_LABEL: Record<Phase, string> = { focus: "Focus", shortBreak: "Short", longBreak: "Long" };
const SEGMENTS = 24;

export function useTimerActions() {
  const sound = useSettings((s) => s.sound);
  const notifications = useSettings((s) => s.notifications);
  const status = useTimer((s) => s.status);
  return {
    toggle: () => {
      audio.unlock();
      if (notifications) void ensureNotificationPermission();
      if (sound) audio.play(status === "running" ? "pause" : "start");
      useTimer.getState().toggle();
    },
    reset: () => {
      if (sound) audio.play("click");
      useTimer.getState().reset();
    },
    skip: () => {
      if (sound) audio.play("click");
      useTimer.getState().skip();
    },
  };
}

export function PomodoroTimer() {
  const phase = useTimer((s) => s.phase);
  const status = useTimer((s) => s.status);
  const remaining = useTimer((s) => getRemaining(s, s.now));
  const progress = useTimer((s) => getProgress(s, s.now));
  const cycleCount = useTimer((s) => s.cycleCount);
  const interval = useSettings((s) => s.longBreakInterval);
  const task = useTasks((s) => s.tasks.find((t) => t.id === s.currentTaskId && !t.done));
  const { toggle, reset, skip } = useTimerActions();

  const running = status === "running";
  const filled = Math.round(progress * SEGMENTS);
  const label = status === "idle" ? "Start" : running ? "Pause" : "Resume";
  const session = phase === "focus" ? Math.min(cycleCount + 1, interval) : cycleCount;

  const selectPhase = (p: Phase) => {
    if (running || p === phase) return;
    const cfg = timerConfigOf(useSettings.getState());
    const d = phaseDuration(p, cfg);
    useTimer.setState({ phase: p, status: "idle", endsAt: null, remainingMs: d, phaseDurationMs: d });
  };

  return (
    <div
      data-phase={phase}
      className="px-panel anim-pop flex flex-col items-center"
      style={{
        background: "var(--hud)",
        padding: "calc(var(--s) * 5px) calc(var(--s) * 8px) calc(var(--s) * 7px)",
        gap: "calc(var(--s) * 3px)",
        minWidth: "calc(var(--s) * 120px)",
      }}
    >
      <div className="flex items-center" style={{ gap: "calc(var(--s) * 2px)" }} role="tablist" aria-label="Session type">
        {PHASES.map((p) => {
          const active = p === phase;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={active}
              disabled={running && !active}
              onClick={() => selectPhase(p)}
              data-phase={p}
              className="font-pixel border-0 disabled:cursor-not-allowed"
              style={{
                fontSize: "calc(var(--s) * 3.2px)",
                padding: "calc(var(--s) * 1.4px) calc(var(--s) * 2.6px)",
                background: active ? "var(--phase)" : "transparent",
                color: active ? "#fff8ec" : "var(--muted)",
                boxShadow: active ? "inset -2px -2px 0 0 rgba(0,0,0,.25), 0 0 0 2px var(--border)" : "none",
                opacity: running && !active ? 0.5 : 1,
              }}
            >
              {SHORT_LABEL[p]}
            </button>
          );
        })}
      </div>

      <div
        className="font-pixel tabular-nums"
        style={{
          fontSize: "calc(var(--s) * 15px)",
          lineHeight: 1,
          color: "var(--text)",
          textShadow: "calc(var(--s) * 1px) calc(var(--s) * 1px) 0 var(--border)",
          marginTop: "calc(var(--s) * 1.5px)",
        }}
        role="timer"
        aria-live="off"
        aria-label={`${PHASE_LABEL[phase]} ${formatClock(remaining)} remaining`}
      >
        <span className={status === "paused" ? "anim-blink" : undefined}>{formatClock(remaining)}</span>
      </div>

      <div
        className="flex w-full"
        style={{ gap: "calc(var(--s) * 0.6px)", height: "calc(var(--s) * 3px)" }}
        aria-hidden
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              background: i < filled ? "var(--phase)" : "var(--panel-3)",
              boxShadow: "0 0 0 1px var(--border)",
            }}
          />
        ))}
      </div>

      <div
        className="w-full truncate text-center"
        style={{ fontSize: "calc(var(--s) * 6px)", color: "var(--muted)", maxWidth: "calc(var(--s) * 120px)" }}
        title={task?.title}
      >
        {phase === "focus" ? (
          task ? (
            <>
              <span style={{ color: "var(--phase)" }}>▶</span> {task.title}
            </>
          ) : (
            `Session ${session} of ${interval}`
          )
        ) : phase === "longBreak" ? (
          "Long rest. You earned it!"
        ) : (
          "Stretch, sip, breathe."
        )}
      </div>

      <div
        className="flex items-center"
        style={{ gap: "calc(var(--s) * 5px)", marginTop: "calc(var(--s) * 1px)", fontSize: "clamp(11px, calc(var(--s) * 4.6px), 18px)" }}
      >
        <button className="px-btn" onClick={reset} title="Reset (R)" aria-label="Reset" style={{ padding: "0.55em 0.75em" }}>
          <PixelIcon name="reset" size="1.3em" />
        </button>
        <button
          className="px-btn px-btn-primary font-pixel"
          onClick={toggle}
          title="Start / Pause (Space)"
          style={{ minWidth: "10.5em", padding: "0.85em 1.3em", fontSize: "1em" }}
        >
          <PixelIcon name={running ? "pause" : "play"} size="1.1em" />
          {label}
        </button>
        <button className="px-btn" onClick={skip} title="Skip to next session (S)" aria-label="Skip" style={{ padding: "0.55em 0.75em" }}>
          <PixelIcon name="skip" size="1.3em" />
        </button>
      </div>
    </div>
  );
}
