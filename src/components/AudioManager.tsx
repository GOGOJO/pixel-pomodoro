import { useEffect } from "react";
import { useSettings } from "../store/settings";
import { audio } from "../lib/audio";

/** Keeps the Web Audio engine in sync with settings. Renders nothing. */
export function AudioManager() {
  const volume = useSettings((s) => s.volume);
  const ambience = useSettings((s) => s.ambience);
  const ambienceVolume = useSettings((s) => s.ambienceVolume);
  const scene = useSettings((s) => s.scene);

  useEffect(() => {
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    audio.setAmbienceVolume(ambienceVolume);
  }, [ambienceVolume]);

  useEffect(() => {
    audio.setAmbience(ambience ? scene : null);
  }, [ambience, scene]);

  // WebKit only starts audio after a user gesture; retry the ambience bed on the first click.
  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      const s = useSettings.getState();
      if (s.ambience) {
        audio.setAmbience(null);
        audio.setAmbience(s.scene);
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
