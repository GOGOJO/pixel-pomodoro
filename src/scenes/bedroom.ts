import { drawCat, drawCharacter, type CharacterLook } from "./character";
import {
  bands, circle, dither, hash, hline, px, rain, rect, rng, steam, vline,
  type Ctx, type SceneDef, type SceneEnv, type TimeOfDay,
} from "./pixel";

const C = {
  ink: "#231a2b",
  wall: "#5f716b",
  wallDark: "#56665f",
  wallLight: "#6b7d75",
  trim: "#3b2c33",
  wood: "#8a5a3c",
  woodDark: "#6e4530",
  woodLight: "#a06b48",
  floor: "#7d5236",
  floorDark: "#694430",
  floorLight: "#8f6040",
  rug: "#9b4d48",
  rugDark: "#7e3c3b",
  rugLight: "#c47a5c",
  curtain: "#c4894f",
  curtainDark: "#9f6a3a",
  curtainLight: "#dba564",
  blanket: "#56719a",
  blanketDark: "#455b80",
  blanketLight: "#7290b8",
  sheet: "#e9dcc4",
  sheetDark: "#c9b99f",
  leaf: "#5d8a4a",
  leafDark: "#41693a",
  pot: "#b8664a",
  paper: "#efe2c8",
  metal: "#3a3442",
};

const SKY: Record<TimeOfDay, string[]> = {
  day: ["#6f8396", "#7d90a1", "#8c9dab", "#9aaab5"],
  dusk: ["#4a3f63", "#6b5072", "#93607a", "#b8767a"],
  night: ["#0f1426", "#141b31", "#19223c", "#1f2a47"],
};
const HILLS: Record<TimeOfDay, [string, string, string]> = {
  day: ["#6b7d86", "#56686f", "#43545a"],
  dusk: ["#5a4560", "#45354f", "#33283f"],
  night: ["#1b2238", "#151b2d", "#101524"],
};

const LOOK: CharacterLook = {
  id: "bedroom",
  hair: "#4a2f2a",
  hairHi: "#6b4436",
  skin: "#f1c6a0",
  skinShade: "#d9a27e",
  top: "#d9a86a",
  topShade: "#b8854d",
  trim: "#efe2c8",
  pants: "#46506e",
  pantsShade: "#363e57",
  shoes: "#e9dcc4",
  outline: C.ink,
  mug: "#e9dcc4",
};
const CAT = { id: "bedroom-cat", fur: "#3b3340", furShade: "#2c2631", outline: C.ink };

const WIN = { x: 26, y: 34, w: 68, h: 54 };
const DESK_Y = 118;
const HAND = { x: 228, y: 116 };

function back(ctx: Ctx, e: SceneEnv) {
  bands(ctx, 0, 0, 120, 100, SKY[e.tod]);
  const r = rng(7);
  if (e.tod === "night") {
    for (let i = 0; i < 6; i++) px(ctx, WIN.x + r() * WIN.w, WIN.y + r() * 20, "#3c4766");
  }
  const [far, mid, near] = HILLS[e.tod];
  for (let x = WIN.x; x < WIN.x + WIN.w; x++) {
    const h1 = 62 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.19) * 2);
    vline(ctx, x, h1, 100 - h1, far);
  }
  // Rooftops of the houses across the street.
  const roofs = [
    [24, 66, 22, 10], [50, 70, 18, 8], [70, 64, 26, 12],
  ];
  for (const [x, y, w, h] of roofs) {
    rect(ctx, x, y + h, w, 30, mid);
    for (let i = 0; i < h; i++) hline(ctx, x - 2 + i, y + i, w + 4 - i * 2, near);
    if (e.tod !== "day") {
      const lit = e.tod === "night" ? "#e8b85a" : "#c99a5a";
      rect(ctx, x + 4, y + h + 4, 3, 3, lit);
      if (w > 20) rect(ctx, x + w - 8, y + h + 4, 3, 3, mid === "#45354f" ? lit : "#2a2f45");
    } else {
      rect(ctx, x + 4, y + h + 4, 3, 3, "#4a5a63");
    }
  }
  // Tree in the yard.
  circle(ctx, 82, 64, 9, near);
  circle(ctx, 76, 70, 7, near);
  rect(ctx, 80, 72, 2, 20, near);
  rect(ctx, WIN.x, 84, WIN.w, 6, near);
}

function backAnim(ctx: Ctx, e: SceneEnv) {
  const night = e.tod === "night";
  // Rare lightning at night.
  const cycle = e.t % 37;
  if (night && (cycle < 0.08 || (cycle > 0.2 && cycle < 0.26))) {
    ctx.globalAlpha = 0.35;
    rect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, "#c9d4f0");
    ctx.globalAlpha = 1;
  }
  const near = night ? "#4c5b82" : e.tod === "dusk" ? "#b9a0b4" : "#c7d3dd";
  const far = night ? "#323d5e" : e.tod === "dusk" ? "#8f7690" : "#aab8c4";
  rain(ctx, WIN, e.t * 0.7 + 3, far, 7, 110, 0.25, 3);
  rain(ctx, WIN, e.t, near, 5, 170, 0.3, 5);
  // Splashes on the window ledge outside.
  for (let i = 0; i < 4; i++) {
    const k = Math.floor(e.t * 3 + i * 1.7);
    if ((k + i) % 3 === 0) px(ctx, WIN.x + 4 + hash(k * 3 + i) * (WIN.w - 8), WIN.y + WIN.h - 2, near);
  }
}

function wall(ctx: Ctx) {
  rect(ctx, 0, 0, 320, 128, C.wall);
  for (let x = 4; x < 320; x += 12) vline(ctx, x, 8, 92, C.wallDark);
  for (let x = 4; x < 320; x += 12) {
    for (let y = 14; y < 98; y += 10) px(ctx, x + 6, y + ((x / 12) % 2) * 5, C.wallLight);
  }
  rect(ctx, 0, 0, 320, 6, C.trim);
  hline(ctx, 0, 6, 320, C.woodDark);
  hline(ctx, 0, 7, 320, C.wallDark);
  // Wainscot.
  rect(ctx, 0, 98, 320, 30, C.wood);
  hline(ctx, 0, 98, 320, C.woodLight);
  hline(ctx, 0, 99, 320, C.woodLight);
  hline(ctx, 0, 100, 320, C.woodDark);
  for (let x = 6; x < 320; x += 26) {
    rect(ctx, x, 104, 20, 19, C.woodDark);
    rect(ctx, x + 1, 105, 18, 17, C.wood);
    hline(ctx, x + 1, 105, 18, C.woodLight);
  }
  rect(ctx, 0, 125, 320, 3, C.trim);
}

function floor(ctx: Ctx) {
  rect(ctx, 0, 128, 320, 52, C.floor);
  for (let y = 128; y < 180; y += 6) {
    hline(ctx, 0, y, 320, C.floorDark);
    const off = ((y / 6) % 3) * 23;
    for (let x = off; x < 320; x += 70) vline(ctx, x, y + 1, 5, C.floorDark);
    hline(ctx, 0, y + 1, 320, C.floorLight);
  }
  dither(ctx, 0, 128, 320, 3, C.floorDark);
  // Rug.
  rect(ctx, 104, 150, 112, 24, C.ink);
  rect(ctx, 105, 151, 110, 22, C.rug);
  rect(ctx, 109, 154, 102, 16, C.rugDark);
  rect(ctx, 111, 156, 98, 12, C.rug);
  for (let x = 116; x < 206; x += 10) {
    px(ctx, x, 161, C.rugLight); px(ctx, x + 1, 160, C.rugLight); px(ctx, x + 2, 161, C.rugLight); px(ctx, x + 1, 162, C.rugLight);
  }
  for (let x = 106; x < 214; x += 3) { px(ctx, x, 174, C.sheetDark); px(ctx, x, 149, C.sheetDark); }
}

function windowFrame(ctx: Ctx) {
  const { x, y, w, h } = WIN;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, C.ink);
  rect(ctx, x - 3, y - 3, w + 6, h + 6, C.paper);
  rect(ctx, x - 2, y - 2, w + 4, h + 4, C.sheetDark);
  rect(ctx, x, y, w, h, "#000");
  rect(ctx, x + w / 2 - 1, y, 3, h, C.paper);
  vline(ctx, x + w / 2 + 1, y, h, C.sheetDark);
  rect(ctx, x, y + h / 2 - 1, w, 3, C.paper);
  hline(ctx, x, y + h / 2 + 1, w, C.sheetDark);
  // Sill.
  rect(ctx, x - 8, y + h + 4, w + 16, 4, C.paper);
  hline(ctx, x - 8, y + h + 7, w + 16, C.sheetDark);
  hline(ctx, x - 8, y + h + 8, w + 16, C.ink);
  // Curtain rod and curtains.
  rect(ctx, x - 16, y - 8, w + 32, 2, C.metal);
  px(ctx, x - 17, y - 8, C.metal); px(ctx, x + w + 16, y - 8, C.metal);
  curtain(ctx, x - 14, y - 6, 14, h + 16, false);
  curtain(ctx, x + w, y - 6, 14, h + 16, true);
  // Plants on the sill.
  pot(ctx, x + 6, y + h - 4);
  rect(ctx, x + w - 14, y + h - 2, 6, 6, C.pot);
  hline(ctx, x + w - 14, y + h - 2, 6, "#d17d5c");
  rect(ctx, x + w - 12, y + h - 9, 2, 7, C.leaf);
  px(ctx, x + w - 13, y + h - 6, C.leaf); px(ctx, x + w - 9, y + h - 7, C.leaf);
  px(ctx, x + w - 10, y + h - 5, C.leafDark);
}

function curtain(ctx: Ctx, x: number, y: number, w: number, h: number, right: boolean) {
  rect(ctx, x, y, w, h, C.curtain);
  for (let i = 0; i < w; i += 4) {
    vline(ctx, x + i + 1, y, h, C.curtainDark);
    vline(ctx, x + i + 3, y, h, C.curtainLight);
  }
  // Tie-back pinches the curtain in the middle.
  const ty = y + Math.round(h * 0.55);
  const inner = right ? x : x + w - 1;
  for (let i = 0; i < 8; i++) {
    const cut = Math.round(4 - Math.abs(i - 4));
    if (right) rect(ctx, inner, ty - 4 + i, cut, 1, "#000");
    else rect(ctx, inner - cut + 1, ty - 4 + i, cut, 1, "#000");
  }
  rect(ctx, x, ty, w, 2, C.rug);
  for (let yy = y; yy < y + h; yy++) {
    px(ctx, x - 1, yy, C.ink);
    px(ctx, x + w, yy, C.ink);
  }
  hline(ctx, x, y + h, w, C.ink);
}

function pot(ctx: Ctx, x: number, y: number) {
  rect(ctx, x, y + 2, 8, 6, C.pot);
  hline(ctx, x - 1, y + 2, 10, "#d17d5c");
  hline(ctx, x, y + 7, 8, "#8f4a37");
  const leaves = [[1, 0], [3, -2], [5, -1], [2, -4], [6, -4], [4, -6], [0, -3], [7, -2]];
  for (const [dx, dy] of leaves) {
    px(ctx, x + dx, y + dy, C.leaf);
    px(ctx, x + dx + 1, y + dy, C.leafDark);
  }
}

function bed(ctx: Ctx) {
  // Headboard.
  rect(ctx, 4, 108, 12, 50, C.ink);
  rect(ctx, 5, 109, 10, 48, C.woodDark);
  rect(ctx, 6, 110, 8, 4, C.woodLight);
  vline(ctx, 7, 115, 40, C.wood);
  vline(ctx, 11, 115, 40, C.wood);
  // Frame and mattress.
  rect(ctx, 14, 140, 104, 18, C.ink);
  rect(ctx, 15, 141, 102, 16, C.woodDark);
  hline(ctx, 15, 141, 102, C.woodLight);
  rect(ctx, 14, 124, 104, 18, C.ink);
  rect(ctx, 15, 125, 102, 16, C.sheet);
  // Blanket, folded at the pillow end.
  rect(ctx, 38, 123, 80, 20, C.ink);
  rect(ctx, 39, 124, 78, 18, C.blanket);
  for (let x = 39; x < 117; x += 10) {
    for (let y = 124; y < 142; y += 6) {
      px(ctx, x + 4, y + 2, C.blanketLight);
      px(ctx, x + 5, y + 3, C.blanketLight);
    }
  }
  rect(ctx, 39, 124, 78, 2, C.blanketLight);
  rect(ctx, 39, 140, 78, 2, C.blanketDark);
  rect(ctx, 38, 123, 6, 20, C.sheet);
  vline(ctx, 44, 124, 18, C.sheetDark);
  vline(ctx, 37, 123, 20, C.ink);
  // Pillow.
  rect(ctx, 17, 118, 20, 9, C.ink);
  rect(ctx, 18, 119, 18, 7, C.paper);
  hline(ctx, 18, 125, 18, C.sheetDark);
  // Legs.
  rect(ctx, 16, 158, 3, 3, C.ink);
  rect(ctx, 113, 158, 3, 3, C.ink);
}

function desk(ctx: Ctx) {
  // Chair (behind the character).
  rect(ctx, 199, 106, 3, 26, C.ink);
  rect(ctx, 200, 107, 1, 24, C.woodLight);
  rect(ctx, 199, 120, 22, 3, C.ink);
  rect(ctx, 200, 120, 20, 2, C.wood);
  vline(ctx, 201, 123, 8, C.ink);
  vline(ctx, 218, 123, 8, C.ink);
  // Shelf with books and a trailing plant.
  rect(ctx, 236, 66, 70, 3, C.woodDark);
  hline(ctx, 236, 66, 70, C.woodLight);
  hline(ctx, 236, 69, 70, C.ink);
  const r = rng(3);
  const bookColors = ["#a8504a", "#56719a", "#d9a86a", "#5d8a4a", "#8a6a9a", "#efe2c8"];
  let bx = 260;
  for (let i = 0; i < 9; i++) {
    const bw = 3 + Math.floor(r() * 2);
    const bh = 10 + Math.floor(r() * 5);
    rect(ctx, bx, 66 - bh, bw, bh, C.ink);
    rect(ctx, bx, 66 - bh + 1, bw - 1, bh - 1, bookColors[i % bookColors.length]);
    px(ctx, bx + 1, 66 - bh + 3, C.paper);
    bx += bw;
  }
  pot(ctx, 242, 58);
  // Framed picture.
  rect(ctx, 248, 30, 26, 20, C.ink);
  rect(ctx, 249, 31, 24, 18, C.woodLight);
  rect(ctx, 251, 33, 20, 14, "#9ab5c4");
  rect(ctx, 251, 41, 20, 6, C.leaf);
  circle(ctx, 266, 37, 2, "#efd889");
  for (let i = 0; i < 8; i++) hline(ctx, 253 + i, 41 - Math.min(i, 7 - i), 2, C.leafDark);

  // Desk top.
  rect(ctx, 192, DESK_Y, 112, 5, C.ink);
  rect(ctx, 193, DESK_Y + 1, 110, 3, C.woodLight);
  hline(ctx, 193, DESK_Y + 3, 110, C.wood);
  // Lamp.
  rect(ctx, 284, DESK_Y - 3, 10, 3, C.ink);
  rect(ctx, 285, DESK_Y - 2, 8, 1, C.metal);
  vline(ctx, 289, DESK_Y - 22, 20, C.ink);
  for (let i = 0; i < 7; i++) px(ctx, 288 - i, DESK_Y - 23 - Math.round(i * 0.4), C.ink);
  rect(ctx, 273, DESK_Y - 30, 12, 2, C.ink);
  rect(ctx, 272, DESK_Y - 28, 14, 2, C.ink);
  rect(ctx, 271, DESK_Y - 26, 16, 3, C.ink);
  rect(ctx, 273, DESK_Y - 29, 10, 1, "#c9785e");
  rect(ctx, 273, DESK_Y - 27, 12, 1, "#b8664a");
  rect(ctx, 272, DESK_Y - 25, 14, 1, "#a8504a");
  // Books stack.
  rect(ctx, 258, DESK_Y - 4, 18, 4, C.ink);
  rect(ctx, 259, DESK_Y - 3, 16, 2, "#56719a");
  rect(ctx, 260, DESK_Y - 8, 15, 4, C.ink);
  rect(ctx, 261, DESK_Y - 7, 13, 2, "#a8504a");
  hline(ctx, 261, DESK_Y - 5, 13, C.paper);
  // Mug.
  rect(ctx, 248, DESK_Y - 7, 7, 7, C.ink);
  rect(ctx, 249, DESK_Y - 6, 5, 6, "#e9dcc4");
  hline(ctx, 249, DESK_Y - 6, 5, "#5a3a2a");
  px(ctx, 255, DESK_Y - 5, C.ink); px(ctx, 256, DESK_Y - 4, C.ink); px(ctx, 255, DESK_Y - 3, C.ink);
  // Laptop base and lid (seen from the side).
  rect(ctx, 222, DESK_Y - 2, 22, 2, C.ink);
  hline(ctx, 223, DESK_Y - 2, 20, "#8d8a99");
  for (let i = 0; i < 15; i++) {
    px(ctx, 243 + Math.floor(i / 4), DESK_Y - 2 - i, C.ink);
    px(ctx, 242 + Math.floor(i / 4), DESK_Y - 2 - i, "#6d6a7a");
  }
}

function deskFore(ctx: Ctx) {
  // Desk legs and drawer unit in front of the character's legs.
  rect(ctx, 193, DESK_Y + 4, 4, 12, C.ink);
  rect(ctx, 194, DESK_Y + 4, 2, 11, C.woodDark);
  rect(ctx, 270, DESK_Y + 4, 32, 13, C.ink);
  rect(ctx, 271, DESK_Y + 4, 30, 12, C.wood);
  hline(ctx, 271, DESK_Y + 10, 30, C.woodDark);
  rect(ctx, 284, DESK_Y + 6, 4, 1, C.woodLight);
  rect(ctx, 284, DESK_Y + 12, 4, 1, C.woodLight);
  // Bin with crumpled paper.
  rect(ctx, 304, 124, 10, 10, C.ink);
  rect(ctx, 305, 125, 8, 9, "#56665f");
  px(ctx, 307, 123, C.paper); px(ctx, 308, 123, C.paper); px(ctx, 310, 124, C.paper);
}

function front(ctx: Ctx) {
  wall(ctx);
  floor(ctx);
  windowFrame(ctx);
  bed(ctx);
  desk(ctx);
  // Poster above the bed (left of the HUD).
  rect(ctx, 112, 30, 18, 24, C.ink);
  rect(ctx, 113, 31, 16, 22, "#e0c79a");
  circle(ctx, 121, 39, 4, "#c4894f");
  rect(ctx, 115, 46, 12, 1, C.trim);
  rect(ctx, 117, 49, 8, 1, C.trim);
  // String of fairy lights along the ceiling.
  for (let x = 0; x < 320; x++) {
    const y = 10 + Math.round(Math.abs(Math.sin((x / 320) * Math.PI * 4)) * 5);
    px(ctx, x, y, C.trim);
  }
}

function frontAnim(ctx: Ctx, e: SceneEnv) {
  // Raindrops running down the glass.
  for (let i = 0; i < 6; i++) {
    const speed = 4 + hash(i) * 6;
    const span = WIN.h + 10;
    const y = WIN.y + ((e.t * speed + hash(i + 9) * span) % span) - 4;
    const x = WIN.x + 3 + Math.floor(hash(i + 20) * (WIN.w - 6));
    if (Math.abs(x - (WIN.x + WIN.w / 2)) < 3) continue;
    const c = e.tod === "night" ? "#6878a0" : "#dbe5ec";
    for (let k = 0; k < 3; k++) {
      const yy = Math.round(y - k * 2);
      if (yy >= WIN.y && yy < WIN.y + WIN.h && Math.abs(yy - (WIN.y + WIN.h / 2)) > 1) px(ctx, x, yy, c);
    }
  }
  drawCat(ctx, 70, 117, CAT, e.t);
  if (Math.floor(e.t / 3) % 2 === 0) {
    const z = (e.t % 3) / 3;
    px(ctx, 88 + z * 4, 113 - z * 8, "#b9b0c4");
  }
  drawCharacter(ctx, HAND.x, HAND.y, { look: LOOK, activity: e.activity, t: e.t });
  steam(ctx, 250, DESK_Y - 8, e.t, "#d8d0dc", 7);
}

function glowAnim(ctx: Ctx, e: SceneEnv) {
  const working = e.activity === "focus";
  // Laptop screen.
  const scr = working ? "#bfe6ef" : "#7c9db0";
  for (let i = 1; i < 14; i++) px(ctx, 241 + Math.floor(i / 4), DESK_Y - 2 - i, scr);
  if (working && Math.floor(e.t * 3) % 2 === 0) px(ctx, 241 + 2, DESK_Y - 9, "#ffffff");
  // Lamp bulb.
  rect(ctx, 276, DESK_Y - 23, 6, 1, "#ffe9a8");
  rect(ctx, 277, DESK_Y - 22, 4, 1, "#fff5d6");
  if (e.tod !== "day") {
    const colors = ["#ffcf6b", "#ff8a6b", "#9fe0c8", "#f7a8d0"];
    for (let x = 8; x < 320; x += 16) {
      const y = 11 + Math.round(Math.abs(Math.sin((x / 320) * Math.PI * 4)) * 5);
      const on = Math.sin(e.t * 1.5 + x * 0.3) > -0.4;
      const c = colors[(x / 16) % colors.length];
      px(ctx, x, y, on ? c : "#5a4a50");
      if (on) {
        ctx.globalAlpha = 0.35;
        px(ctx, x - 1, y, c); px(ctx, x + 1, y, c); px(ctx, x, y + 1, c);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    for (let x = 8; x < 320; x += 16) {
      const y = 11 + Math.round(Math.abs(Math.sin((x / 320) * Math.PI * 4)) * 5);
      px(ctx, x, y, "#d9cfc0");
    }
  }
}

export const bedroom: SceneDef = {
  id: "bedroom",
  name: "Rainy Bedroom",
  blurb: "Rain taps the window while the lamp hums.",
  swatch: ["#5f716b", "#c4894f", "#56719a", "#ffcf6b"],
  back,
  backAnim,
  front,
  frontAnim,
  fore: deskFore,
  glowAnim,
  windows: [WIN],
  lights: (e) => [
    { x: 279, y: DESK_Y - 12, r: 46, color: "#ffc070", flicker: 0.08 },
    { x: 238, y: DESK_Y - 10, r: e.activity === "focus" ? 18 : 12, color: "#8fd0e8" },
    { x: 60, y: 61, r: 0, color: "#000" },
  ],
  shade: { day: null, dusk: "rgba(70,40,80,0.28)", night: "rgba(12,10,32,0.62)" },
};
