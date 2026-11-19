import { useMemo } from "react";
import { formatMinutes, lastNDays, streak, useHistory } from "../store/history";
import { useClock } from "../hooks";
import { PixelIcon, type IconName } from "./PixelIcon";

const DAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const BAR_STEPS = 10;

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="px-inset flex flex-1 flex-col items-center gap-1 px-1 py-2">
      <PixelIcon name={icon} size={14} className="text-[var(--accent)]" />
      <span className="font-pixel text-[11px]">{value}</span>
      <span className="text-[15px] leading-none" style={{ color: "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}

export function SessionTracker() {
  const sessions = useHistory((s) => s.sessions);
  const now = useClock(60_000);
  const { week, today, total, days } = useMemo(() => {
    const week = lastNDays(sessions, 7, now.getTime());
    return {
      week,
      today: week[week.length - 1],
      total: sessions.reduce((m, s) => m + s.durationMs / 60000, 0),
      days: streak(sessions, now.getTime()),
    };
  }, [sessions, now]);
  const max = Math.max(4, ...week.map((d) => d.count));
  const weekCount = week.reduce((m, d) => m + d.count, 0);
  const weekMin = week.reduce((m, d) => m + d.minutes, 0);

  return (
    <section className="flex flex-col gap-3" aria-label="Statistics">
      <header className="flex items-center justify-between">
        <h2 className="font-pixel m-0 text-[10px]" style={{ color: "var(--accent)" }}>
          TODAY
        </h2>
        <span className="text-[16px]" style={{ color: "var(--muted)" }}>
          {formatMinutes(total)} all-time
        </span>
      </header>
      <div className="flex gap-3">
        <Stat icon="tomato" value={String(today.count)} label="pomodoros" />
        <Stat icon="star" value={formatMinutes(today.minutes)} label="focused" />
        <Stat icon="flame" value={`${days}d`} label="streak" />
      </div>

      <div className="px-inset flex flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between text-[16px]" style={{ color: "var(--muted)" }}>
          <span className="font-pixel text-[8px]" style={{ color: "var(--text)" }}>
            THIS WEEK
          </span>
          <span>
            {weekCount} · {formatMinutes(weekMin)}
          </span>
        </div>
        <div className="flex h-[78px] items-end justify-between gap-2" role="img" aria-label="Focus sessions over the last 7 days">
          {week.map((d, i) => {
            const steps = d.count === 0 ? 0 : Math.max(1, Math.round((d.count / max) * BAR_STEPS));
            const isToday = i === week.length - 1;
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.count} sessions · ${formatMinutes(d.minutes)}`}>
                <span className="text-[14px] leading-none" style={{ color: d.count ? "var(--text)" : "var(--faint)" }}>
                  {d.count || ""}
                </span>
                <div className="flex w-full flex-col-reverse gap-[2px]" style={{ height: BAR_STEPS * 5 }}>
                  {Array.from({ length: steps }, (_, k) => (
                    <div
                      key={k}
                      className="h-[3px] w-full"
                      style={{
                        background: isToday ? "var(--focus)" : "var(--short)",
                        boxShadow: "0 0 0 1px var(--border)",
                        opacity: 0.55 + (k / BAR_STEPS) * 0.45,
                      }}
                    />
                  ))}
                  {steps === 0 && <div className="h-[2px] w-full" style={{ background: "var(--panel-3)" }} />}
                </div>
                <span
                  className="text-[14px] leading-none"
                  style={{ color: isToday ? "var(--accent)" : "var(--muted)" }}
                >
                  {DAY[d.date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
