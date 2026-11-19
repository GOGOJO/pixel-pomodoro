import { drawChair, drawCharacter, type CharacterLook } from "./character";
import {
  bands, circle, dither, ellipse, hash, hline, px, rect, rng, vline,
  type Ctx, type SceneDef, type SceneEnv, type TimeOfDay,
} from "./pixel";

const C = {
  ink: "#1f1712",
  log: "#6e4a32",
  logDark: "#563826",
  logLight: "#86593b",
  logEnd: "#a07450",
  floor: "#5c3d29",
  floorDark: "#4a3020",
  floorLight: "#6c4830",
  stone: "#7d7a80",
  stoneDark: "#5f5c63",
  stoneLight: "#9b97a0",
  plaid: "#8e3b35",
  plaidDark: "#6b2b2a",
  plaidLine: "#2f4a3a",
  paper: "#efe2c8",
  green: "#4f7a45",
  wool: "#c9b28a",
};

const SKY: Record<TimeOfDay, string[]> = {
  day: ["#7fb0c2", "#93bfc8", "#a8cccb", "#bcd8cc"],
  dusk: ["#3f3a64", "#7a4e6e", "#c46a5e", "#eaa266"],
  night: ["#0c1222", "#111a2e", "#16223a", "#1b2a44"],
};
const MOUNTAIN: Record<TimeOfDay, [string, string]> = {
  day: ["#8aa8b4", "#c8dde0"],
  dusk: ["#6a4a6a", "#d8a0a0"],
  night: ["#1d2840", "#4a5878"],
};
const PINES: Record<TimeOfDay, string[]> = {
  day: ["#5d8a72", "#3f6e52", "#2c5440"],
  dusk: ["#5a4a5e", "#3f3548", "#2a2434"],
  night: ["#182234", "#121a28", "#0c121e"],
};

const LOOK: CharacterLook = {
  id: "cabin",
  hair: "#8a4b2a",
  hairHi: "#a8643a",
  skin: "#e8b48e",
  skinShade: "#c98f6c",
  top: "#3f6e52",
  topShade: "#2c5440",
  trim: "#c9b28a",
  pants: "#5a4a3a",
  pantsShade: "#45382b",
  shoes: "#6e4a32",
  outline: C.ink,
  mug: "#c9b28a",
};

const WIN = { x: 22, y: 30, w: 100, h: 60 };
const DESK_Y = 118;
const HAND = { x: 186, y: 116 };
const FIRE = { x: 264, y: 100, w: 32, h: 26 };

/** A stacked-triangle pine tree: three tiers that widen toward the base. */
function pine(ctx: Ctx, x: number, base: number, h: number, c: string) {
  const tiers = 3;
  const tierH = h / tiers;
  for (let i = 0; i < h; i++) {
    const tier = Math.floor(i / tierH);
    const within = (i - tier * tierH) / tierH;
    const maxHalf = 1 + (tier + 1) * (h / 10);
    const half = Math.round(within * maxHalf * 0.9 + tier * 0.5);
    hline(ctx, x - half, base - h + i, half * 2 + 1, c);
  }
  rect(ctx, x, base, 1, 2, c);
}

function back(ctx: Ctx, e: SceneEnv) {
  bands(ctx, 0, 0, 140, 100, SKY[e.tod]);
  const r = rng(11);
  if (e.tod === "night") {
    for (let i = 0; i < 26; i++) px(ctx, WIN.x + r() * WIN.w, WIN.y + r() * 30, r() > 0.7 ? "#e8e4c8" : "#6a7898");
    circle(ctx, 100, 42, 5, "#e8e4c8");
    circle(ctx, 102, 41, 4, SKY.night[0]);
  } else if (e.tod === "dusk") {
    circle(ctx, 96, 72, 7, "#ffd38a");
  } else {
    circle(ctx, 104, 40, 5, "#fff3c8");
    // Clouds.
    for (const [cx, cy] of [[44, 42], [80, 36]]) {
      ellipse(ctx, cx, cy, 9, 2, "#e6efe8");
      ellipse(ctx, cx + 4, cy - 2, 5, 2, "#f4f8f2");
    }
  }
  const [mtn, snow] = MOUNTAIN[e.tod];
  for (let x = WIN.x; x < WIN.x + WIN.w; x++) {
    const peak = 58 + Math.round(Math.abs(((x - 20) % 46) - 23) * 0.55 + Math.sin(x * 0.3) * 1.2);
    vline(ctx, x, peak, 100 - peak, mtn);
    if (peak < 62) vline(ctx, x, peak, 2, snow);
  }
  const [p1, p2, p3] = PINES[e.tod];
  dither(ctx, WIN.x, 70, WIN.w, 4, p1);
  rect(ctx, WIN.x, 74, WIN.w, 26, p1);
  for (let i = 0; i < 12; i++) pine(ctx, WIN.x + 4 + i * 9 + Math.round(r() * 4), 74, 10 + Math.round(r() * 6), p1);
  for (let i = 0; i < 8; i++) pine(ctx, WIN.x + i * 14 + Math.round(r() * 6), 84, 14 + Math.round(r() * 8), p2);
  for (let i = 0; i < 5; i++) pine(ctx, WIN.x + 6 + i * 22 + Math.round(r() * 6), 92, 22 + Math.round(r() * 6), p3);
  // Ground mist.
  if (e.tod !== "night") dither(ctx, WIN.x, 79, WIN.w, 4, e.tod === "day" ? "#a8c8b8" : "#9a6a78", true);
}

function backAnim(ctx: Ctx, e: SceneEnv) {
  if (e.tod === "night") {
    for (let i = 0; i < 9; i++) {
      const x = WIN.x + 6 + hash(i) * (WIN.w - 12) + Math.sin(e.t * 0.7 + i) * 4;
      const y = WIN.y + 34 + hash(i + 5) * 22 + Math.cos(e.t * 0.9 + i * 2) * 3;
      const on = Math.sin(e.t * 2 + i * 1.7) > 0;
      if (on) px(ctx, x, y, "#e8f078");
    }
  } else {
    // Birds gliding across.
    for (let i = 0; i < 2; i++) {
      const period = 22 + i * 9;
      const p = ((e.t + i * 11) % period) / period;
      const x = WIN.x - 6 + p * (WIN.w + 12);
      const y = WIN.y + 12 + i * 8 + Math.sin(e.t * 2 + i) * 2;
      const flap = Math.floor(e.t * 4 + i) % 2;
      const c = e.tod === "day" ? "#3c4a50" : "#2a2232";
      px(ctx, x, y, c);
      px(ctx, x - 1, y - flap, c); px(ctx, x + 1, y - flap, c);
      px(ctx, x - 2, y - flap * 2 + 1, c); px(ctx, x + 2, y - flap * 2 + 1, c);
    }
    // Drifting leaves.
    const leaf = e.tod === "day" ? "#d9a441" : "#e07a4a";
    for (let i = 0; i < 4; i++) {
      const span = WIN.h + 6;
      const y = WIN.y + ((e.t * (5 + i) + hash(i + 3) * span) % span);
      const x = WIN.x + hash(i + 7) * WIN.w + Math.sin(e.t * 1.3 + i) * 5;
      if (x > WIN.x && x < WIN.x + WIN.w) px(ctx, x, y, leaf);
    }
  }
}

function logs(ctx: Ctx) {
  for (let y = 0; y < 128; y += 9) {
    rect(ctx, 0, y, 320, 9, C.log);
    hline(ctx, 0, y, 320, C.ink);
    hline(ctx, 0, y + 1, 320, C.logLight);
    hline(ctx, 0, y + 2, 320, C.logLight);
    hline(ctx, 0, y + 7, 320, C.logDark);
    hline(ctx, 0, y + 8, 320, C.logDark);
    const r = rng(y + 1);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 320);
      hline(ctx, x, y + 4 + Math.floor(r() * 2), 4 + Math.floor(r() * 8), C.logDark);
    }
    // Log ends at the corner on the left.
    rect(ctx, 0, y + 1, 5, 7, C.logEnd);
    px(ctx, 2, y + 4, C.logDark);
    vline(ctx, 5, y + 1, 7, C.ink);
  }
  rect(ctx, 0, 125, 320, 3, C.ink);
}

function floor(ctx: Ctx) {
  rect(ctx, 0, 128, 320, 52, C.floor);
  for (let y = 128; y < 180; y += 7) {
    hline(ctx, 0, y, 320, C.floorDark);
    hline(ctx, 0, y + 1, 320, C.floorLight);
    const off = ((y / 7) % 2) * 40;
    for (let x = off; x < 320; x += 80) vline(ctx, x, y + 1, 6, C.floorDark);
  }
  dither(ctx, 0, 128, 320, 3, C.floorDark);
  // Plaid rug with fringed ends.
  const rx = 124, ry = 148, rw = 120, rh = 24;
  rect(ctx, rx - 1, ry - 1, rw + 2, rh + 2, C.ink);
  rect(ctx, rx, ry, rw, rh, C.plaid);
  for (let x = rx + 6; x < rx + rw; x += 12) rect(ctx, x, ry, 3, rh, C.plaidDark);
  for (let y = ry + 4; y < ry + rh; y += 8) rect(ctx, rx, y, rw, 2, C.plaidDark);
  for (let x = rx + 12; x < rx + rw; x += 24) vline(ctx, x, ry, rh, C.plaidLine);
  for (let y = ry + 2; y < ry + rh; y += 2) {
    px(ctx, rx - 2, y, C.wool);
    px(ctx, rx + rw + 1, y, C.wool);
  }
}

function windowFrame(ctx: Ctx) {
  const { x, y, w, h } = WIN;
  rect(ctx, x - 5, y - 5, w + 10, h + 10, C.ink);
  rect(ctx, x - 4, y - 4, w + 8, h + 8, C.logEnd);
  rect(ctx, x - 2, y - 2, w + 4, h + 4, C.logDark);
  for (const mx of [x + 33, x + 66]) {
    rect(ctx, mx - 1, y, 3, h, C.logEnd);
    vline(ctx, mx + 1, y, h, C.logDark);
  }
  rect(ctx, x, y + 26, w, 2, C.logEnd);
  hline(ctx, x, y + 28, w, C.logDark);
  // Sill with a candle jar and pinecones.
  rect(ctx, x - 8, y + h + 5, w + 16, 4, C.logEnd);
  hline(ctx, x - 8, y + h + 8, w + 16, C.logDark);
  hline(ctx, x - 8, y + h + 9, w + 16, C.ink);
  for (const px0 of [x + 8, x + 14]) {
    ellipse(ctx, px0, y + h + 2, 2, 2, "#6e4a32");
    px(ctx, px0, y + h, "#86593b");
  }
  rect(ctx, x + w - 16, y + h - 2, 8, 7, C.ink);
  rect(ctx, x + w - 15, y + h - 1, 6, 6, C.green);
  for (let i = 0; i < 4; i++) px(ctx, x + w - 14 + i * 1.5, y + h - 4 - (i % 2) * 2, C.green);
}

function fireplace(ctx: Ctx) {
  // Chimney and hearth stones.
  rect(ctx, 252, 0, 56, 70, C.stoneDark);
  rect(ctx, 244, 70, 72, 58, C.stoneDark);
  const r = rng(5);
  const stoneBlock = (x0: number, y0: number, w0: number, h0: number) => {
    for (let y = y0; y < y0 + h0; y += 6) {
      let x = x0 - Math.floor(r() * 6);
      while (x < x0 + w0) {
        const sw = 7 + Math.floor(r() * 7);
        const cx = Math.max(x, x0), cw = Math.min(x + sw, x0 + w0) - cx;
        if (cw > 1) {
          rect(ctx, cx, y, cw - 1, 5, r() > 0.5 ? C.stone : "#8a868d");
          hline(ctx, cx, y, cw - 1, C.stoneLight);
        }
        x += sw;
      }
    }
  };
  stoneBlock(253, 0, 54, 70);
  stoneBlock(245, 76, 70, 52);
  vline(ctx, 251, 0, 70, C.ink);
  vline(ctx, 308, 0, 70, C.ink);
  // Mantel.
  rect(ctx, 240, 68, 80, 7, C.ink);
  rect(ctx, 241, 69, 78, 5, C.logEnd);
  hline(ctx, 241, 73, 78, C.logDark);
  // Firebox.
  rect(ctx, FIRE.x - 3, FIRE.y - 4, FIRE.w + 6, FIRE.h + 4, C.stoneDark);
  for (let i = 0; i < FIRE.w + 6; i += 5) rect(ctx, FIRE.x - 3 + i, FIRE.y - 4, 4, 3, C.stoneLight);
  rect(ctx, FIRE.x, FIRE.y, FIRE.w, FIRE.h, "#140c0a");
  rect(ctx, FIRE.x, FIRE.y + FIRE.h - 4, FIRE.w, 2, "#2a1a14");
  // Logs in the fire.
  rect(ctx, FIRE.x + 4, FIRE.y + FIRE.h - 6, 24, 4, "#4a2e1e");
  rect(ctx, FIRE.x + 8, FIRE.y + FIRE.h - 9, 16, 3, "#5a3a26");
  hline(ctx, FIRE.x + 4, FIRE.y + FIRE.h - 6, 24, "#6e4a32");
  // Mantel decor: candles, a small framed picture, a jar.
  for (const [cx, h] of [[248, 7], [253, 5]]) {
    rect(ctx, cx, 68 - h, 3, h, C.paper);
    vline(ctx, cx + 2, 68 - h, h, "#d8c8a8");
  }
  rect(ctx, 270, 54, 16, 14, C.ink);
  rect(ctx, 271, 55, 14, 12, C.logEnd);
  rect(ctx, 273, 57, 10, 8, "#9ab5a8");
  pine(ctx, 278, 64, 7, "#3f6e52");
  rect(ctx, 300, 60, 7, 8, C.ink);
  rect(ctx, 301, 61, 5, 7, "#a8643a");
  // Firewood stack.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      const cx = 230 + i * 6 + row * 3, cy = 124 - row * 5;
      circle(ctx, cx, cy, 2, C.ink);
      circle(ctx, cx, cy, 1, C.logEnd);
      px(ctx, cx, cy, C.logDark);
    }
  }
}

function desk(ctx: Ctx) {
  // Chair.
  drawChair(ctx, HAND.x, HAND.y, { ink: C.ink, base: C.logLight, light: C.logEnd, back: 22 });
  // Knitted blanket draped over the chair back.
  rect(ctx, HAND.x - 22, 103, 5, 13, C.wool);
  dither(ctx, HAND.x - 22, 103, 5, 13, "#b09a74");
  hline(ctx, HAND.x - 22, 116, 5, C.ink);
  // Desk top.
  rect(ctx, 150, DESK_Y, 76, 5, C.ink);
  rect(ctx, 151, DESK_Y + 1, 74, 3, C.logEnd);
  hline(ctx, 151, DESK_Y + 3, 74, C.logLight);
  // Open notebook.
  rect(ctx, 182, DESK_Y - 2, 22, 2, C.ink);
  hline(ctx, 183, DESK_Y - 2, 9, C.paper);
  hline(ctx, 193, DESK_Y - 2, 10, "#e0d2b6");
  // Stack of books + mug.
  rect(ctx, 206, DESK_Y - 4, 14, 4, C.ink);
  rect(ctx, 207, DESK_Y - 3, 12, 2, "#8e3b35");
  rect(ctx, 207, DESK_Y - 8, 12, 4, C.ink);
  rect(ctx, 208, DESK_Y - 7, 10, 2, "#3f6e52");
  // Candle in a holder.
  rect(ctx, 213, DESK_Y - 15, 3, 7, C.paper);
  vline(ctx, 215, DESK_Y - 15, 7, "#d8c8a8");
  rect(ctx, 211, DESK_Y - 9, 7, 1, C.ink);
  // Hanging map on the wall.
  rect(ctx, 136, 60, 28, 22, C.ink);
  rect(ctx, 137, 61, 26, 20, "#d8c49a");
  for (let i = 0; i < 6; i++) px(ctx, 141 + i * 3, 66 + Math.round(Math.sin(i) * 3), "#8e3b35");
  pine(ctx, 156, 76, 6, "#4f7a45");
  hline(ctx, 140, 77, 10, "#6a9ab0");
}

function fore(ctx: Ctx) {
  rect(ctx, 151, DESK_Y + 4, 4, 12, C.ink);
  rect(ctx, 152, DESK_Y + 4, 2, 11, C.logDark);
  rect(ctx, 220, DESK_Y + 4, 4, 12, C.ink);
  rect(ctx, 221, DESK_Y + 4, 2, 11, C.logDark);
  const r = rng(9);
  for (let i = 0; i < 14; i++) {
    const len = 6 + Math.floor(r() * 8);
    const dir = r() > 0.5 ? 1 : -1;
    for (let k = 0; k < len; k++) px(ctx, 14 + dir * k * 0.8 + i % 3, 172 - k - (i % 4), i % 2 ? "#3f6e52" : "#4f7a45");
  }
  rect(ctx, 8, 170, 16, 10, C.ink);
  rect(ctx, 9, 171, 14, 9, "#8a5a3c");
  hline(ctx, 9, 171, 14, "#a06b48");
}

function front(ctx: Ctx) {
  logs(ctx);
  floor(ctx);
  windowFrame(ctx);
  fireplace(ctx);
  desk(ctx);
  // Coat hooks with a scarf on the left wall.
  rect(ctx, 8, 40, 2, 3, C.ink);
  rect(ctx, 6, 43, 6, 16, "#8e3b35");
  for (let y = 45; y < 59; y += 3) hline(ctx, 6, y, 6, "#c9b28a");
  for (let i = 0; i < 3; i++) px(ctx, 7 + i * 2, 59, "#8e3b35");
  // Hanging lantern hook (bulb drawn as glow).
  vline(ctx, 230, 0, 22, C.ink);
  rect(ctx, 226, 22, 9, 2, C.ink);
  rect(ctx, 227, 24, 7, 8, C.ink);
  rect(ctx, 228, 25, 5, 6, "#5a4030");
  rect(ctx, 226, 32, 9, 2, C.ink);
}

function frontAnim(ctx: Ctx, e: SceneEnv) {
  drawCharacter(ctx, HAND.x, HAND.y, { look: LOOK, activity: e.activity, t: e.t, writing: true });
}

function flame(ctx: Ctx, e: SceneEnv) {
  const base = FIRE.y + FIRE.h - 7;
  const cols = ["#ffd56a", "#ffa040", "#e0582e", "#9e2e22"];
  for (let i = 0; i < 22; i++) {
    const x = FIRE.x + 5 + i;
    const n = Math.sin(e.t * 9 + i * 1.3) + Math.sin(e.t * 5.3 + i * 0.7);
    const center = 1 - Math.abs(i - 11) / 12;
    const h = Math.max(2, Math.round(center * 13 + n * 2.2));
    for (let k = 0; k < h; k++) {
      const band = k / h;
      const c = band < 0.35 ? cols[0] : band < 0.6 ? cols[1] : band < 0.85 ? cols[2] : cols[3];
      px(ctx, x, base - k, c);
    }
  }
  // Embers.
  for (let i = 0; i < 4; i++) {
    const p = (e.t * 0.8 + hash(i)) % 1;
    const x = FIRE.x + 10 + hash(i + 4) * 12 + Math.sin(e.t * 3 + i) * 2;
    px(ctx, x, base - 10 - p * 12, p < 0.7 ? "#ffb050" : "#9e2e22");
  }
}

function glowAnim(ctx: Ctx, e: SceneEnv) {
  flame(ctx, e);
  // Candle flames.
  const flick = Math.floor(e.t * 8) % 3;
  const candles: [number, number][] = [[214, DESK_Y - 15], [249, 61], [254, 63]];
  for (const [x, y] of candles) {
    px(ctx, x, y - 1, "#ffd56a");
    px(ctx, x, y - 2, flick ? "#ffd56a" : "#fff0b0");
    if (flick === 1) px(ctx, x + 1, y - 2, "#ffa040");
    px(ctx, x, y - 3, "#ffa040");
  }
  // Lantern.
  rect(ctx, 228, 25, 5, 6, e.tod === "day" ? "#e8b860" : "#ffd56a");
  rect(ctx, 229, 26, 3, 4, "#fff0b0");
}

export const cabin: SceneDef = {
  id: "cabin",
  name: "Forest Cabin",
  blurb: "Pines sway outside; the fire crackles.",
  swatch: ["#6e4a32", "#3f6e52", "#ffa040", "#bcd8cc"],
  back,
  backAnim,
  front,
  frontAnim,
  fore,
  glowAnim,
  windows: [WIN],
  lights: () => [
    { x: 280, y: 112, r: 62, color: "#ff9a40", flicker: 0.25 },
    { x: 214, y: 104, r: 24, color: "#ffc070", nightOnly: true },
    { x: 230, y: 30, r: 30, color: "#ffc070", nightOnly: true },
  ],
  shade: { day: null, dusk: "rgba(80,40,50,0.3)", night: "rgba(10,8,24,0.66)" },
};
