import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appStorage } from "../lib/storage";
import type { TimerConfig } from "../lib/timerEngine";

export type SceneId = "bedroom" | "cabin" | "cafe" | "city";
export type Appearance = "system" | "light" | "dark";
export type SceneLighting = "auto" | "day" | "dusk" | "night";
export type AmbienceSource = "builtin" | "custom";

/** Describes the user's uploaded ambient track; the audio itself is stored separately. */
export interface CustomAmbience {
  name: string;
  type: string;
  savedAt: number;
}

export interface Settings extends TimerConfig {
  sound: boolean;
  volume: number;
  ambience: boolean;
  ambienceVolume: number;
  ambienceSource: AmbienceSource;
  customAmbience: CustomAmbience | null;
  notifications: boolean;
  scene: SceneId;
  appearance: Appearance;
  lighting: SceneLighting;
  showSidebar: boolean;
  unlockAll: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakInterval: 4,
  autoAdvance: true,
  sound: true,
  volume: 0.6,
  ambience: false,
  ambienceVolume: 0.35,
  ambienceSource: "builtin",
  customAmbience: null,
  notifications: true,
  scene: "bedroom",
  appearance: "system",
  lighting: "auto",
  showSidebar: true,
  unlockAll: false,
};

/** Completed focus sessions needed before a scene can be picked. */
export const SCENE_UNLOCKS: Record<SceneId, number> = { bedroom: 0, cabin: 2, cafe: 5, city: 10 };

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  restoreDefaults: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      // The uploaded track stays on disk, so its metadata survives a reset.
      restoreDefaults: () => set((s) => ({ ...DEFAULT_SETTINGS, customAmbience: s.customAmbience })),
    }),
    {
      name: "settings",
      version: 1,
      storage: appStorage,
      partialize: ({ update: _u, restoreDefaults: _r, ...rest }) => rest,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Settings>) }),
    },
  ),
);

export const timerConfigOf = (s: Settings): TimerConfig => ({
  focusMin: s.focusMin,
  shortBreakMin: s.shortBreakMin,
  longBreakMin: s.longBreakMin,
  longBreakInterval: s.longBreakInterval,
  autoAdvance: s.autoAdvance,
});
