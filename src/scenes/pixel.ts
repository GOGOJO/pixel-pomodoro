export const W = 320;
export const H = 180;

export type Ctx = CanvasRenderingContext2D;
export type TimeOfDay = "day" | "dusk" | "night";
export type Activity = "focus" | "break" | "longBreak" | "idle" | "paused";

export interface SceneEnv {
  /** Seconds since the scene started animating. */
  t: number;
  /** Frame counter at the scene's animation rate. */
  frame: number;
  tod: TimeOfDay;
  activity: Activity;
}

export interface Light {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Lights that only matter after dark (lamps). Others glow all the time (screens, fire). */
  nightOnly?: boolean;
  flicker?: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneDef {
  id: string;
  name: string;
  blurb: string;
  swatch: string[];
  back: (ctx: Ctx, e: SceneEnv) => void;
  backAnim?: (ctx: Ctx, e: SceneEnv) => void;
  /** Static interior; window openings must be left transparent. */
  front: (ctx: Ctx, e: SceneEnv) => void;
  frontAnim?: (ctx: Ctx, e: SceneEnv) => void;
  /** Static pieces drawn in front of the character (desk fronts, foreground plants). */
  fore?: (ctx: Ctx, e: SceneEnv) => void;
  /** Light-emitting details drawn after night shading so they stay bright. */
  glowAnim?: (ctx: Ctx, e: SceneEnv) => void;
  windows: Rect[];
  lights: (e: SceneEnv) => Light[];
  /** Darkness of the interior per time of day, as rgba. */
  shade: Record<TimeOfDay, string | null>;
}

export const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx] as const;
};

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: Ctx, x: number, y: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function hline(ctx: Ctx, x: number, y: number, w: number, c: string) {
  rect(ctx, x, y, w, 1, c);
}

export function vline(ctx: Ctx, x: number, y: number, h: number, c: string) {
  rect(ctx, x, y, 1, h, c);
}

/** Checkerboard dither of colour `b` over the area (used to blend bands without gradients). */
export function dither(ctx: Ctx, x: number, y: number, w: number, h: number, b: string, sparse = false) {
  ctx.fillStyle = b;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const X = x + i, Y = y + j;
      if (sparse ? X % 2 === 0 && Y % 2 === 0 && (X + Y) % 4 === 0 : (X + Y) % 2 === 0) ctx.fillRect(X, Y, 1, 1);
    }
  }
}

/** Stepped vertical "gradient": solid bands joined by a row of dither. */
export function bands(ctx: Ctx, x: number, y: number, w: number, h: number, colors: string[]) {
  const n = colors.length;
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    const y0 = Math.round(y + i * bh);
    const y1 = Math.round(y + (i + 1) * bh);
    rect(ctx, x, y0, w, y1 - y0, colors[i]);
    if (i > 0) dither(ctx, x, y0, w, 2, colors[i - 1]);
  }
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap deterministic hash for per-object animation offsets. */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Renders an ASCII sprite ('.' is transparent) into a cached canvas. */
export function sprite(key: string, rows: string[], pal: Record<string, string>, outlineColor?: string) {
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const w = Math.max(...rows.map((r) => r.length));
  const pad = outlineColor ? 1 : 0;
  const [c, ctx] = makeCanvas(w + pad * 2, rows.length + pad * 2);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      if (k === "." || k === " ") continue;
      const col = pal[k];
      if (col) px(ctx, x + pad, y + pad, col);
    }
  });
  const out = outlineColor ? outline(c, outlineColor) : c;
  spriteCache.set(key, out);
  return out;
}

/** Adds a 1px outline around every opaque pixel of a canvas. */
export function outline(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  const sctx = src.getContext("2d")!;
  const data = sctx.getImageData(0, 0, src.width, src.height).data;
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < src.width && y < src.height && data[(y * src.width + x) * 4 + 3] > 0;
  ctx.fillStyle = color;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.drawImage(src, 0, 0);
  return c;
}

export function cached(key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(w, h);
  draw(ctx);
  spriteCache.set(key, c);
  return c;
}

export function blit(ctx: Ctx, img: CanvasImageSource, x: number, y: number, flip = false) {
  if (!flip) {
    ctx.drawImage(img, Math.round(x), Math.round(y));
    return;
  }
  const w = (img as HTMLCanvasElement).width;
  ctx.save();
  ctx.translate(Math.round(x) + w, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Diagonal rain streaks inside a rect; `density` is drops per 1000px². */
export function rain(ctx: Ctx, r: Rect, t: number, color: string, density = 6, speed = 160, slant = 0.25, len = 5) {
  const count = Math.round((r.w * r.h * density) / 1000);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const h1 = hash(i + 1), h2 = hash(i + 101), h3 = hash(i + 201);
    const sp = speed * (0.75 + h3 * 0.5);
    const travel = r.h + len + 20;
    const y = ((h2 * travel + t * sp) % travel) - len;
    const x = r.x + ((h1 * (r.w + 30) + y * slant) % (r.w + 30)) - 15;
    for (let k = 0; k < len; k++) {
      const X = Math.round(x + k * slant), Y = Math.round(r.y + y + k);
      if (X >= r.x && X < r.x + r.w && Y >= r.y && Y < r.y + r.h) ctx.fillRect(X, Y, 1, 1);
    }
  }
}

/** Steam wisps rising from a cup. */
export function steam(ctx: Ctx, x: number, y: number, t: number, color: string, height = 8) {
  ctx.fillStyle = color;
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < height; i++) {
      const phase = t * 2.2 + k * 2.4;
      const yy = y - ((i + t * 6 + k * 3) % height);
      const xx = x + k * 3 + Math.round(Math.sin(phase + yy * 0.6) * 1.2);
      if ((i + k) % 3 !== 0) ctx.fillRect(xx, Math.round(yy), 1, 1);
    }
  }
}
