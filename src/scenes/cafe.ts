import { drawChair, drawCharacter, type CharacterLook } from "./character";
import {
  bands, circle, dither, ellipse, hash, hline, px, rect, rng, sprite, blit, steam, vline,
  type Ctx, type SceneDef, type SceneEnv, type TimeOfDay,
} from "./pixel";

const C = {
  ink: "#2a1c1c",
  plaster: "#d9c4a0",
  plasterDark: "#c8b08a",
  plasterLight: "#e6d4b2",
  beam: "#4a3022",
  wood: "#7a4e34",
  woodDark: "#5e3a26",
  woodLight: "#9a6644",
  floor: "#8a5e3e",
  floorDark: "#744c32",
  floorLight: "#9c6c48",
  red: "#b8433c",
  redDark: "#8e3030",
  noren: "#2f4660",
  paper: "#f2e6cc",
  green: "#5a7a4a",
  greenDark: "#3e5c38",
  chalk: "#2e3f36",
  metal: "#8d8a99",
  metalDark: "#5e5b6a",
};

const SKY: Record<TimeOfDay, string[]> = {
  day: ["#9cc4dc", "#acd0e2", "#bcdae6", "#cde4ea"],
  dusk: ["#5a4a7a", "#9a6080", "#d88a7a", "#f0b07a"],
  night: ["#121428", "#181b34", "#1e2240", "#24294a"],
};
const STREET: Record<TimeOfDay, { bld: string; bldDark: string; road: string; win: string; sakura: string; sakuraDark: string; trunk: string }> = {
  day: { bld: "#c8b8a8", bldDark: "#a8988a", road: "#8a8890", win: "#7a98a8", sakura: "#f4bccb", sakuraDark: "#e290a8", trunk: "#5a3a2e" },
  dusk: { bld: "#9a7a80", bldDark: "#7a5e68", road: "#6a5a68", win: "#e8b070", sakura: "#e8a0b0", sakuraDark: "#c87890", trunk: "#3e2a2e" },
  night: { bld: "#2e2c44", bldDark: "#24223a", road: "#2a2a3a", win: "#f0c070", sakura: "#a87890", sakuraDark: "#86607a", trunk: "#1e1626" },
};

const LOOK: CharacterLook = {
  id: "cafe",
  hair: "#1f1a24",
  hairHi: "#3a3244",
  skin: "#f3d0ae",
  skinShade: "#dcae8c",
  top: "#e6dccb",
  topShade: "#c4b8a4",
  trim: "#2f4660",
  pants: "#5a6a88",
  pantsShade: "#46546e",
  shoes: "#b8433c",
  outline: C.ink,
  mug: "#f2e6cc",
};

const BARISTA = [
  "....hhhh....",
  "...hhhhhh...",
  "..hhssssh...",
  "..hsssssh...",
  "..hsesesh...",
  "...sssss....",
  "....sss.....",
  "..aaaaaaaa..",
  ".aaaAAAAaaa.",
  ".aaaAAAAaaa.",
  ".aaaAAAAaaa.",
  ".aaaAAAAaaa.",
];

const WIN = { x: 16, y: 30, w: 86, h: 64 };
const DESK_Y = 120;
const HAND = { x: 140, y: 118 };
const COUNTER_Y = 100;

function back(ctx: Ctx, e: SceneEnv) {
  const s = STREET[e.tod];
  bands(ctx, 0, 0, 110, 100, SKY[e.tod]);
  if (e.tod === "night") {
    const r = rng(4);
    for (let i = 0; i < 10; i++) px(ctx, WIN.x + r() * WIN.w, WIN.y + r() * 16, "#8890b8");
    circle(ctx, 30, 40, 3, "#f0ecd0");
  }
  // Shop across the street.
  rect(ctx, WIN.x, 48, 60, 40, s.bld);
  rect(ctx, WIN.x, 48, 60, 3, s.bldDark);
  for (let i = 0; i < 3; i++) {
    rect(ctx, WIN.x + 6 + i * 18, 56, 10, 10, s.bldDark);
    rect(ctx, WIN.x + 7 + i * 18, 57, 8, 8, e.tod === "day" ? s.win : i === 1 ? "#3a3650" : s.win);
    hline(ctx, WIN.x + 7 + i * 18, 61, 8, s.bldDark);
  }
  // Shop awning and noren.
  rect(ctx, WIN.x, 72, 60, 3, C.red);
  for (let i = 0; i < 60; i += 6) rect(ctx, WIN.x + i, 75, 5, 7, i % 12 ? "#f2e6cc" : C.redDark);
  rect(ctx, WIN.x + 60, 40, 40, 50, s.bldDark);
  for (let y = 44; y < 86; y += 8) hline(ctx, WIN.x + 60, y, 40, s.bld);
  // Street and pavement.
  rect(ctx, WIN.x, 86, WIN.w, 10, s.road);
  hline(ctx, WIN.x, 86, WIN.w, s.bldDark);
  for (let x = WIN.x; x < WIN.x + WIN.w; x += 10) hline(ctx, x, 91, 5, e.tod === "night" ? "#4a4a5a" : "#b8b8c0");
  // Street lamp.
  vline(ctx, 92, 52, 34, "#3a3a44");
  rect(ctx, 89, 50, 7, 3, "#3a3a44");
  // Sakura tree.
  vline(ctx, 40, 60, 28, s.trunk);
  vline(ctx, 41, 64, 24, s.trunk);
  for (let i = 0; i < 8; i++) px(ctx, 41 + i, 64 - i * 0.6, s.trunk);
  const r = rng(21);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = 44 + Math.cos(a) * d * 20, y = 52 + Math.sin(a) * d * 11;
    px(ctx, x, y, r() > 0.4 ? s.sakura : s.sakuraDark);
    px(ctx, x + 1, y, s.sakura);
    px(ctx, x, y + 1, s.sakuraDark);
  }
  ellipse(ctx, 44, 52, 16, 8, s.sakura);
  dither(ctx, 30, 50, 30, 8, s.sakuraDark);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = 0.7 + r() * 0.4;
    px(ctx, 44 + Math.cos(a) * d * 19, 52 + Math.sin(a) * d * 10, s.sakura);
  }
}

function backAnim(ctx: Ctx, e: SceneEnv) {
  const s = STREET[e.tod];
  for (let i = 0; i < 10; i++) {
    const span = WIN.h;
    const p = (e.t * (4 + hash(i) * 4) + hash(i + 2) * span) % span;
    const x = WIN.x + 14 + hash(i + 5) * 50 + p * 0.5 + Math.sin(e.t * 1.7 + i) * 3;
    const y = 48 + p * 0.7;
    if (x < WIN.x + WIN.w && y < WIN.y + WIN.h) px(ctx, x, y, i % 3 ? s.sakura : "#fff0f4");
  }
  // A cyclist passes now and then.
  const period = 26;
  const p = (e.t % period) / period;
  if (p < 0.35) {
    const x = WIN.x + WIN.w - (p / 0.35) * (WIN.w + 16);
    const c = e.tod === "night" ? "#14121e" : "#3a3446";
    circle(ctx, x, 89, 2, c);
    circle(ctx, x + 7, 89, 2, c);
    hline(ctx, x, 87, 8, c);
    rect(ctx, x + 3, 80, 3, 7, e.tod === "night" ? "#2a2440" : "#c8584a");
    rect(ctx, x + 3, 77, 3, 3, c);
    if (e.tod === "night") px(ctx, x - 1, 87, "#fff0b0");
  }
}

function room(ctx: Ctx) {
  rect(ctx, 0, 0, 320, 128, C.plaster);
  const r = rng(2);
  for (let i = 0; i < 160; i++) px(ctx, r() * 320, 10 + r() * 80, r() > 0.5 ? C.plasterDark : C.plasterLight);
  // Ceiling beams.
  rect(ctx, 0, 0, 320, 8, C.beam);
  hline(ctx, 0, 8, 320, C.ink);
  for (let x = 0; x < 320; x += 40) {
    rect(ctx, x, 0, 6, 10, C.beam);
    px(ctx, x + 2, 10, C.ink);
  }
  // Wainscot.
  rect(ctx, 0, 96, 320, 32, C.wood);
  hline(ctx, 0, 96, 320, C.ink);
  hline(ctx, 0, 97, 320, C.woodLight);
  for (let x = 0; x < 320; x += 5) vline(ctx, x, 98, 27, C.woodDark);
  rect(ctx, 0, 125, 320, 3, C.ink);
  // Floor.
  rect(ctx, 0, 128, 320, 52, C.floor);
  for (let y = 128; y < 180; y += 8) {
    for (let x = ((y / 8) % 2) * 8; x < 320; x += 16) {
      rect(ctx, x, y, 8, 8, C.floorDark);
      hline(ctx, x, y, 8, C.floorLight);
    }
  }
  dither(ctx, 0, 128, 320, 3, C.ink);
}

function windowFrame(ctx: Ctx) {
  const { x, y, w, h } = WIN;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, C.ink);
  rect(ctx, x - 3, y - 3, w + 6, h + 6, C.woodDark);
  // Shoji-style lattice on the top band.
  rect(ctx, x, y, w, 2, C.woodDark);
  for (const mx of [x + 28, x + 57]) {
    rect(ctx, mx, y, 2, h, C.woodDark);
    vline(ctx, mx + 2, y, h, C.ink);
  }
  rect(ctx, x, y + 14, w, 2, C.woodDark);
  for (let i = 1; i < 6; i++) vline(ctx, x + i * 14, y + 2, 12, C.woodDark);
  // Ledge with a bonsai and a little lucky cat.
  rect(ctx, x - 6, y + h + 4, w + 12, 4, C.woodLight);
  hline(ctx, x - 6, y + h + 7, w + 12, C.woodDark);
  hline(ctx, x - 6, y + h + 8, w + 12, C.ink);
  rect(ctx, x + 6, y + h, 12, 4, "#4a5a7a");
  hline(ctx, x + 6, y + h, 12, "#6a7a9a");
  ellipse(ctx, x + 12, y + h - 5, 6, 3, C.green);
  dither(ctx, x + 7, y + h - 6, 10, 2, C.greenDark);
  vline(ctx, x + 12, y + h - 3, 3, C.wood);
  const mx = x + w - 14, my = y + h - 4;
  rect(ctx, mx, my, 7, 8, C.ink);
  rect(ctx, mx + 1, my + 1, 5, 7, C.paper);
  px(ctx, mx, my - 1, C.ink); px(ctx, mx + 6, my - 1, C.ink);
  px(ctx, mx + 2, my + 3, C.ink); px(ctx, mx + 4, my + 3, C.ink);
  px(ctx, mx + 3, my + 5, C.red);
}

function counter(ctx: Ctx) {
  // Back shelves with cups and jars.
  for (const sy of [46, 66]) {
    rect(ctx, 200, sy, 116, 3, C.woodDark);
    hline(ctx, 200, sy, 116, C.woodLight);
    hline(ctx, 200, sy + 3, 116, C.ink);
  }
  const r = rng(8);
  const cupCols = ["#f2e6cc", "#b8433c", "#2f4660", "#5a7a4a", "#d9a86a"];
  for (let x = 204; x < 312; x += 8) {
    const c = cupCols[Math.floor(r() * cupCols.length)];
    if (r() > 0.5) {
      rect(ctx, x, 40, 5, 6, C.ink);
      rect(ctx, x + 1, 41, 3, 5, c);
    } else {
      rect(ctx, x, 38, 6, 8, C.ink);
      rect(ctx, x + 1, 39, 4, 7, "#c8d8d0");
      rect(ctx, x + 1, 42, 4, 4, c === "#f2e6cc" ? "#8a5e3e" : c);
    }
    if (r() > 0.4) {
      rect(ctx, x, 60, 6, 6, C.ink);
      rect(ctx, x + 1, 61, 4, 5, cupCols[Math.floor(r() * cupCols.length)]);
      px(ctx, x + 6, 62, C.ink);
    }
  }
  // Menu board.
  rect(ctx, 256, 14, 50, 20, C.ink);
  rect(ctx, 257, 15, 48, 18, C.chalk);
  for (let i = 0; i < 4; i++) {
    hline(ctx, 260, 18 + i * 4, 18 + Math.floor(r() * 12), "#d8dcc8");
    hline(ctx, 296, 18 + i * 4, 6, "#e8c070");
  }
  // Counter body.
  rect(ctx, 196, COUNTER_Y, 124, 6, C.ink);
  rect(ctx, 197, COUNTER_Y + 1, 123, 4, C.woodLight);
  hline(ctx, 197, COUNTER_Y + 4, 123, C.wood);
  rect(ctx, 198, COUNTER_Y + 6, 122, 22, C.woodDark);
  for (let x = 200; x < 320; x += 6) vline(ctx, x, COUNTER_Y + 6, 21, C.wood);
  hline(ctx, 198, COUNTER_Y + 6, 122, C.ink);
  vline(ctx, 197, COUNTER_Y + 6, 22, C.ink);
  // Espresso machine.
  rect(ctx, 284, COUNTER_Y - 16, 26, 16, C.ink);
  rect(ctx, 285, COUNTER_Y - 15, 24, 14, C.metal);
  rect(ctx, 285, COUNTER_Y - 15, 24, 3, C.red);
  rect(ctx, 290, COUNTER_Y - 8, 3, 3, C.metalDark);
  rect(ctx, 300, COUNTER_Y - 8, 3, 3, C.metalDark);
  rect(ctx, 290, COUNTER_Y - 3, 3, 2, C.paper);
  // Register and a plant.
  rect(ctx, 208, COUNTER_Y - 8, 12, 8, C.ink);
  rect(ctx, 209, COUNTER_Y - 7, 10, 7, "#4a5a7a");
  rect(ctx, 210, COUNTER_Y - 6, 8, 2, "#9fe0c8");
  rect(ctx, 226, COUNTER_Y - 5, 6, 5, C.red);
  for (let i = 0; i < 6; i++) px(ctx, 226 + i, COUNTER_Y - 7 - (i % 3), C.green);
}

function table(ctx: Ctx) {
  // Stool behind the character.
  drawChair(ctx, HAND.x, HAND.y, { ink: C.ink, base: C.wood, light: C.woodLight, back: 16 });
  // Table.
  rect(ctx, 130, DESK_Y, 48, 4, C.ink);
  rect(ctx, 131, DESK_Y + 1, 46, 2, C.woodLight);
  // Laptop.
  rect(ctx, 134, DESK_Y - 2, 20, 2, C.ink);
  hline(ctx, 135, DESK_Y - 2, 18, "#c8c4d0");
  for (let i = 0; i < 13; i++) {
    px(ctx, 155 + Math.floor(i / 4), DESK_Y - 2 - i, C.ink);
    px(ctx, 154 + Math.floor(i / 4), DESK_Y - 2 - i, "#a8a4b4");
  }
  // Latte in a bowl cup + saucer.
  rect(ctx, 162, DESK_Y - 1, 12, 1, C.ink);
  rect(ctx, 164, DESK_Y - 6, 8, 5, C.ink);
  rect(ctx, 165, DESK_Y - 5, 6, 4, C.paper);
  hline(ctx, 165, DESK_Y - 5, 6, "#c89a6a");
  px(ctx, 172, DESK_Y - 4, C.ink);
  // Small vase.
  rect(ctx, 175, DESK_Y - 6, 2, 6, "#2f4660");
  px(ctx, 175, DESK_Y - 8, C.red); px(ctx, 176, DESK_Y - 9, "#f4bccb");
}

function lantern(ctx: Ctx, x: number, y: number) {
  vline(ctx, x + 4, 0, y, C.ink);
  const L = sprite(
    "cafe-lantern",
    [
      "..kkkkk..",
      ".rrrrrrr.",
      "rrRrrrRrr",
      "rrRrrrRrr",
      "rrRrrrRrr",
      "rrRrrrRrr",
      "rrRrrrRrr",
      ".rrrrrrr.",
      "..kkkkk..",
      "....y....",
    ],
    { k: C.ink, r: C.red, R: C.redDark, y: "#e8c070" },
  );
  blit(ctx, L, x, y);
}

function front(ctx: Ctx) {
  room(ctx);
  windowFrame(ctx);
  counter(ctx);
  table(ctx);
  // Noren over the kitchen door (right) and hanging lanterns.
  lantern(ctx, 108, 14);
  lantern(ctx, 232, 18);
  // Brass pendant lamp over the espresso machine.
  vline(ctx, 296, 0, 50, C.ink);
  rect(ctx, 292, 50, 9, 2, C.ink);
  rect(ctx, 290, 52, 13, 4, C.ink);
  rect(ctx, 291, 52, 11, 3, "#b8904a");
  hline(ctx, 291, 52, 11, "#d8b06a");
  // Calligraphy scroll.
  rect(ctx, 114, 40, 12, 3, C.woodDark);
  rect(ctx, 115, 43, 10, 30, C.paper);
  for (let i = 0; i < 4; i++) rect(ctx, 119, 46 + i * 6, 2 + (i % 2), 3, C.ink);
  rect(ctx, 114, 73, 12, 2, C.woodDark);
}

function frontAnim(ctx: Ctx, e: SceneEnv) {
  // Barista wiping a cup behind the counter.
  const P = { h: "#3a2a2a", s: "#e8b890", e: C.ink, a: C.noren, A: "#3e5a78" };
  const bob = Math.floor(e.t * 1.2) % 2;
  blit(ctx, sprite("barista", BARISTA, P, C.ink), 250, COUNTER_Y - 13 + bob);
  const wipe = Math.round(Math.sin(e.t * 4) * 2);
  rect(ctx, 256 + wipe, COUNTER_Y - 6 + bob, 4, 4, C.paper);
  px(ctx, 257 + wipe, COUNTER_Y - 5 + bob, "#e8b890");
  rect(ctx, 253 - wipe, COUNTER_Y - 5 + bob, 3, 3, "#f2e6cc");
  drawCharacter(ctx, HAND.x, HAND.y, { look: LOOK, activity: e.activity, t: e.t });
  steam(ctx, 167, DESK_Y - 7, e.t, "#fff8ec", 8);
  // Espresso machine steam puff every so often.
  if (e.t % 14 < 2) steam(ctx, 298, COUNTER_Y - 17, e.t, "#f8f4f0", 6);
}

function fore(ctx: Ctx) {
  vline(ctx, 154, DESK_Y + 4, 10, C.ink);
  vline(ctx, 155, DESK_Y + 4, 10, C.woodDark);
  rect(ctx, 146, DESK_Y + 13, 18, 2, C.ink);
  // Big potted plant in the right foreground.
  rect(ctx, 296, 160, 18, 20, C.ink);
  rect(ctx, 297, 161, 16, 19, "#d9c4a0");
  hline(ctx, 297, 163, 16, "#b8a07a");
  const r = rng(17);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    for (let k = 0; k < 18; k++) {
      const x = 305 + Math.cos(a) * k, y = 160 + Math.sin(a) * k;
      px(ctx, x, y, k > 12 ? C.green : C.greenDark);
      if (k > 6 && k % 3 === 0) px(ctx, x + 1, y, C.green);
    }
  }
}

function glowAnim(ctx: Ctx, e: SceneEnv) {
  const working = e.activity === "focus";
  for (let i = 1; i < 12; i++) px(ctx, 153 + Math.floor(i / 4), DESK_Y - 2 - i, working ? "#d0f0e8" : "#8aa8a0");
  const on = e.tod !== "day";
  for (const [x, y] of [[108, 14], [232, 18]]) {
    if (on) {
      rect(ctx, x + 1, y + 2, 7, 5, "#e8704a");
      rect(ctx, x + 3, y + 3, 3, 3, "#ffc080");
    }
  }
  if (e.tod === "night") {
    rect(ctx, 89, 53, 7, 1, "#fff0b0");
    ctx.globalAlpha = 0.25;
    rect(ctx, 87, 54, 11, 6, "#ffe0a0");
    ctx.globalAlpha = 1;
  }
  rect(ctx, 210, COUNTER_Y - 6, 8, 2, "#9fe0c8");
  rect(ctx, 293, 56, 7, 1, on ? "#fff0b0" : "#e8d8b0");
}

export const cafe: SceneDef = {
  id: "cafe",
  name: "Sakura Café",
  blurb: "Petals drift past a quiet corner table.",
  swatch: ["#d9c4a0", "#b8433c", "#f4bccb", "#2f4660"],
  back,
  backAnim,
  front,
  frontAnim,
  fore,
  glowAnim,
  windows: [WIN],
  lights: (e) => [
    { x: 112, y: 22, r: 34, color: "#ff9a6a", nightOnly: true },
    { x: 236, y: 26, r: 40, color: "#ff9a6a", nightOnly: true },
    { x: 150, y: DESK_Y - 8, r: e.activity === "focus" ? 16 : 10, color: "#a0e8d8" },
    { x: 296, y: 70, r: 34, color: "#ffc070", nightOnly: true },
  ],
  shade: { day: null, dusk: "rgba(90,50,60,0.22)", night: "rgba(16,10,30,0.55)" },
};
