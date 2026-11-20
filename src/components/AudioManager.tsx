import { useEffect } from "react";
import { useSettings } from "../store/settings";
import { audio } from "../lib/audio";
import { loadCustomAmbience } from "../lib/customAmbience";

/** Keeps the Web Audio engine in sync with settings. Renders nothing. */
export function AudioManager() {
  const volume = useSettings((s) => s.volume);
  const ambience = useSettings((s) => s.ambience);
  const ambienceVolume = useSettings((s) => s.ambienceVolume);
  const scene = useSettings((s) => s.scene);
  const useCustom = useSettings((s) => s.ambienceSource === "custom" && s.customAmbience !== null);
  const customType = useSettings((s) => s.customAmbience?.type ?? null);
  const customSavedAt = useSettings((s) => s.customAmbience?.savedAt ?? null);

  useEffect(() => {
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    audio.setAmbienceVolume(ambienceVolume);
  }, [ambienceVolume]);

  useEffect(() => {
    if (customType === null) {
      audio.setCustomTrack(null);
      return;
    }
    let cancelled = false;
    loadCustomAmbience(customType)
      .then((track) => !cancelled && audio.setCustomTrack(track))
      .catch((e) => console.error("couldn't load custom ambience", e));
    return () => {
      cancelled = true;
    };
  }, [customType, customSavedAt]);

  useEffect(() => {
    audio.setAmbience(ambience ? (useCustom ? "custom" : scene) : null);
  }, [ambience, scene, useCustom]);

  // WebKit only starts audio after a user gesture; retry the ambience bed on the first click.
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      const s = useSettings.getState();
      if (s.ambience) {
        audio.setAmbience(null);
        audio.setAmbience(s.ambienceSource === "custom" && s.customAmbience ? "custom" : s.scene);
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
