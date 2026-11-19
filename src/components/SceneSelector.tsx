import { SCENES, SCENE_ORDER } from "../scenes";
import { SCENE_UNLOCKS, useSettings, type SceneId } from "../store/settings";
import { useHistory } from "../store/history";
import { useTimeOfDay } from "../hooks";
import { audio } from "../lib/audio";
import { SceneThumbnail } from "./PixelEnvironment";
import { PixelIcon } from "./PixelIcon";
import { Modal } from "./Modal";

export function useSceneUnlocks() {
  const total = useHistory((s) => s.sessions.length);
  const unlockAll = useSettings((s) => s.unlockAll);
  return (id: SceneId) => unlockAll || total >= SCENE_UNLOCKS[id];
}

export function SceneSelector({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scene = useSettings((s) => s.scene);
  const sound = useSettings((s) => s.sound);
  const tod = useTimeOfDay();
  const total = useHistory((s) => s.sessions.length);
  const isUnlocked = useSceneUnlocks();

  const pick = (id: SceneId) => {
    if (!isUnlocked(id)) return;
    if (sound) audio.play("click");
    useSettings.getState().update({ scene: id });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="CHOOSE A WORLD" width={640}>
      <div className="grid grid-cols-2 gap-5 p-1">
        {SCENE_ORDER.map((id, i) => {
          const def = SCENES[id];
          const active = id === scene;
          const unlocked = active || isUnlocked(id);
          const need = SCENE_UNLOCKS[id] - total;
          return (
            <button
              key={id}
              onClick={() => pick(id)}
              disabled={!unlocked}
              className="px-btn flex-col items-stretch !gap-2 !p-2 text-left disabled:!opacity-100"
              data-pressed={active}
              style={{
                ["--btn-bg" as string]: active ? "var(--panel-3)" : "var(--panel-2)",
                outline: active ? "3px solid var(--accent)" : "none",
                outlineOffset: 5,
              }}
              aria-pressed={active}
            >
              <div className="relative" style={{ boxShadow: "0 0 0 2px var(--border)" }}>
                <SceneThumbnail sceneId={id} tod={tod} className={unlocked ? "" : "grayscale brightness-50"} />
                {!unlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#f3e6cf]">
                    <PixelIcon name="lock" size={22} />
                    <span className="font-pixel text-[8px]">
                      {need} MORE {need === 1 ? "POMODORO" : "POMODOROS"}
                    </span>
                  </div>
                )}
                <span className="font-pixel absolute top-1 left-1 bg-[var(--border)] px-1 text-[8px] text-[#f3e6cf]">
                  {i + 1}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="font-pixel text-[9px]">{def.name}</span>
                <span className="flex gap-[3px]">
                  {def.swatch.map((c) => (
                    <span key={c} className="h-[8px] w-[8px]" style={{ background: c, boxShadow: "0 0 0 1px var(--border)" }} />
                  ))}
                </span>
              </div>
              <span className="px-1 text-[17px] leading-tight" style={{ color: "var(--muted)" }}>
                {def.blurb}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 mb-0 text-center text-[16px]" style={{ color: "var(--faint)" }}>
        Complete focus sessions to unlock new worlds. Lighting follows the time of day.
      </p>
    </Modal>
  );
}
