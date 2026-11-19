import { H, W, makeCanvas, type Ctx, type Light, type SceneDef, type SceneEnv, type TimeOfDay } from "./pixel";

interface Layers {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  fore: HTMLCanvasElement | null;
  mask: HTMLCanvasElement | null;
  glow: HTMLCanvasElement;
  lights: Light[];
}

const layerCache = new Map<string, Layers>();

function stepped(ctx: Ctx, l: Light, steps: number, alphaFor: (i: number) => number, color: string) {
  for (let i = 0; i < steps; i++) {
    const r = Math.round(l.r * (1 - i / steps));
    ctx.globalAlpha = alphaFor(i);
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      // Slightly flattened pools read better in a front-facing room.
      const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y * 1.6)));
      if (half <= 0) continue;
      ctx.fillRect(Math.round(l.x - half), Math.round(l.y + y), half * 2, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function build(scene: SceneDef, env: SceneEnv): Layers {
  const [back, b] = makeCanvas(W, H);
  scene.back(b, env);

  const [front, f] = makeCanvas(W, H);
  scene.front(f, env);
  for (const win of scene.windows) f.clearRect(win.x, win.y, win.w, win.h);

  let fore: HTMLCanvasElement | null = null;
  if (scene.fore) {
    const [c, ctx] = makeCanvas(W, H);
    scene.fore(ctx, env);
    fore = c;
  }

  const lights = scene.lights(env);
  const shade = scene.shade[env.tod];
  let mask: HTMLCanvasElement | null = null;
  if (shade) {
    const [c, ctx] = makeCanvas(W, H);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    for (const win of scene.windows) {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
    ctx.globalAlpha = 1;
    for (const l of lights) stepped(ctx, l, 5, (i) => 0.22 + i * 0.1, "#000");
    ctx.globalCompositeOperation = "source-over";
    mask = c;
  }

  const [glow, g] = makeCanvas(W, H);
  const night = env.tod !== "day";
  for (const l of lights) {
    if (l.nightOnly && !night) continue;
    const strength = night ? 1 : 0.35;
    stepped(g, l, 4, (i) => (0.025 + i * 0.022) * strength, l.color);
  }

  return { back, front, fore, mask, glow, lights };
}

export function getLayers(scene: SceneDef, env: SceneEnv): Layers {
  const key = `${scene.id}:${env.tod}`;
  let layers = layerCache.get(key);
  if (!layers) {
    layers = build(scene, env);
    layerCache.set(key, layers);
  }
  return layers;
}

export function renderScene(ctx: Ctx, scene: SceneDef, env: SceneEnv) {
  const L = getLayers(scene, env);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(L.back, 0, 0);
  scene.backAnim?.(ctx, env);
  ctx.drawImage(L.front, 0, 0);
  scene.frontAnim?.(ctx, env);
  if (L.fore) ctx.drawImage(L.fore, 0, 0);
  if (L.mask) ctx.drawImage(L.mask, 0, 0);
  const flicker = L.lights.reduce((m, l) => Math.max(m, l.flicker ?? 0), 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = flicker ? 1 - flicker + flicker * (0.6 + 0.4 * Math.sin(env.t * 13) * Math.sin(env.t * 7.3)) : 1;
  ctx.drawImage(L.glow, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  scene.glowAnim?.(ctx, env);
}

export function timeOfDayFor(date: Date): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 7 && h < 17.5) return "day";
  if ((h >= 17.5 && h < 20) || (h >= 5.5 && h < 7)) return "dusk";
  return "night";
}
