import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appStorage } from "../lib/storage";
import { uid } from "../lib/platform";
import type { SceneId } from "./settings";

export interface SessionRecord {
  id: string;
  endedAt: number;
  durationMs: number;
  taskId: string | null;
  taskTitle: string | null;
  scene: SceneId;
}

interface HistoryStore {
  sessions: SessionRecord[];
  addSession: (s: Omit<SessionRecord, "id">) => void;
  clearHistory: () => void;
}

const MAX_SESSIONS = 5000;

export const useHistory = create<HistoryStore>()(
  persist(
    (set) => ({
      sessions: [],
      addSession: (rec) => set((s) => ({ sessions: [...s.sessions, { ...rec, id: uid() }].slice(-MAX_SESSIONS) })),
      clearHistory: () => set({ sessions: [] }),
    }),
    { name: "history", version: 1, storage: appStorage, partialize: (s) => ({ sessions: s.sessions }) },
  ),
);

export const dayKey = (t: number | Date) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export interface DayStat {
  key: string;
  date: Date;
  count: number;
  minutes: number;
}

export function lastNDays(sessions: SessionRecord[], n: number, now = Date.now()): DayStat[] {
  const days: DayStat[] = [];
  const today = startOfDay(now);
  const index = new Map<string, DayStat>();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const stat = { key: dayKey(d), date: d, count: 0, minutes: 0 };
    days.push(stat);
    index.set(stat.key, stat);
  }
  for (const s of sessions) {
    const stat = index.get(dayKey(s.endedAt));
    if (stat) {
      stat.count++;
      stat.minutes += s.durationMs / 60000;
    }
  }
  return days;
}

export function streak(sessions: SessionRecord[], now = Date.now()): number {
  const days = new Set(sessions.map((s) => dayKey(s.endedAt)));
  let n = 0;
  const d = new Date(startOfDay(now));
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const formatMinutes = (min: number) => {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
