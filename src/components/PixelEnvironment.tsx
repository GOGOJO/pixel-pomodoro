import { useEffect, useRef } from "react";
import { SCENES } from "../scenes";
import { H, W, makeCanvas, type Activity, type SceneEnv, type TimeOfDay } from "../scenes/pixel";
import { renderScene } from "../scenes/renderer";
import type { SceneId } from "../store/settings";

const FPS = 15;
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const TRANSITION_S = 0.55;
const BLOCK = 8;

interface Props {
  sceneId: SceneId;
  tod: TimeOfDay;
  activity: Activity;
  className?: string;
}

export function PixelEnvironment({ sceneId, tod, activity, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ sceneId, tod, activity });
  live.current = { sceneId, tod, activity };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const [snap, snapCtx] = makeCanvas(W, H);
    let current = live.current.sceneId;
    let transitionAt = -1;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 1000 / FPS - 2) return;
      last = now;
      const t = (now - t0) / 1000;
      const { sceneId: id, tod: td, activity: act } = live.current;
      if (id !== current) {
        snapCtx.clearRect(0, 0, W, H);
        snapCtx.drawImage(canvas, 0, 0);
        transitionAt = t;
        current = id;
      }
      const env: SceneEnv = { t, frame: Math.floor(t * FPS), tod: td, activity: act };
      renderScene(ctx, SCENES[id], env);
      if (transitionAt >= 0) {
        const p = (t - transitionAt) / TRANSITION_S;
        if (p >= 1) transitionAt = -1;
        else {
          for (let by = 0; by < H / BLOCK; by++) {
            for (let bx = 0; bx < W / BLOCK; bx++) {
              if (p < (BAYER[by % 4][bx % 4] + 0.5) / 16) {
                ctx.drawImage(snap, bx * BLOCK, by * BLOCK, BLOCK, BLOCK, bx * BLOCK, by * BLOCK, BLOCK, BLOCK);
              }
            }
          }
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className={`pixelated block h-full w-full ${className ?? ""}`}
      aria-label={`${SCENES[sceneId].name} scene`}
      role="img"
    />
  );
}

/** A single still frame of a scene, used for the scene picker. */
export function SceneThumbnail({ sceneId, tod, className }: { sceneId: SceneId; tod: TimeOfDay; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    renderScene(ctx, SCENES[sceneId], { t: 1.3, frame: 0, tod, activity: "focus" });
  }, [sceneId, tod]);
  return <canvas ref={ref} width={W} height={H} className={`pixelated block w-full ${className ?? ""}`} />;
}
