import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isTauri } from "./platform";

const PREFIX = "pixel-pomodoro:";

async function invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(cmd, args);
}

const pending = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function flush(key: string) {
  const value = pending.get(key);
  timers.delete(key);
  if (value === undefined) return Promise.resolve();
  pending.delete(key);
  return invoke<void>("save_data", { key, value }).catch((e) => console.error("save failed", key, e));
}

/** Writes any debounced saves immediately (used before the window goes away). */
export function flushAll() {
  for (const [key, t] of timers) {
    clearTimeout(t);
    void flush(key);
  }
}

/** Saves into JSON files in the app data directory, or localStorage outside the desktop shell. */
const fileStorage: StateStorage = {
  getItem: async (name) => {
    if (!isTauri) return localStorage.getItem(PREFIX + name);
    try {
      return await invoke<string | null>("load_data", { key: name });
    } catch (e) {
      console.error("load failed", name, e);
      return null;
    }
  },
  setItem: (name, value) => {
    if (!isTauri) {
      localStorage.setItem(PREFIX + name, value);
      return;
    }
    pending.set(name, value);
    if (!timers.has(name)) timers.set(name, setTimeout(() => void flush(name), 300));
  },
  removeItem: (name) => {
    if (!isTauri) localStorage.removeItem(PREFIX + name);
    else void invoke("save_data", { key: name, value: "null" });
  },
};

export const appStorage = createJSONStorage(() => fileStorage);

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushAll);
  window.addEventListener("beforeunload", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}
