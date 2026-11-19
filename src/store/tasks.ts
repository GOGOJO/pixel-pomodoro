import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appStorage } from "../lib/storage";
import { uid } from "../lib/platform";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
  pomodoros: number;
  estimate: number;
}

interface TasksStore {
  tasks: Task[];
  currentTaskId: string | null;
  addTask: (title: string, estimate?: number) => string | null;
  removeTask: (id: string) => void;
  renameTask: (id: string, title: string) => void;
  toggleDone: (id: string) => void;
  setCurrent: (id: string | null) => void;
  creditPomodoro: (id: string) => void;
  clearCompleted: () => void;
}

export const useTasks = create<TasksStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentTaskId: null,
      addTask: (title, estimate = 1) => {
        const t = title.trim().slice(0, 120);
        if (!t) return null;
        const task: Task = {
          id: uid(),
          title: t,
          done: false,
          createdAt: Date.now(),
          completedAt: null,
          pomodoros: 0,
          estimate: Math.max(1, Math.min(12, Math.round(estimate))),
        };
        set((s) => ({
          tasks: [...s.tasks, task],
          currentTaskId: s.currentTaskId ?? task.id,
        }));
        return task.id;
      },
      removeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          currentTaskId: s.currentTaskId === id ? null : s.currentTaskId,
        })),
      renameTask: (id, title) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id && title.trim() ? { ...t, title: title.trim() } : t)) })),
      toggleDone: (id) =>
        set((s) => {
          const tasks = s.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() } : t,
          );
          let currentTaskId = s.currentTaskId;
          const toggled = tasks.find((t) => t.id === id);
          if (toggled?.done && currentTaskId === id) {
            currentTaskId = tasks.find((t) => !t.done)?.id ?? null;
          }
          return { tasks, currentTaskId };
        }),
      setCurrent: (id) => set({ currentTaskId: id && get().tasks.some((t) => t.id === id) ? id : null }),
      creditPomodoro: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, pomodoros: t.pomodoros + 1 } : t)) })),
      clearCompleted: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),
    }),
    {
      name: "tasks",
      version: 1,
      storage: appStorage,
      partialize: (s) => ({ tasks: s.tasks, currentTaskId: s.currentTaskId }),
    },
  ),
);
