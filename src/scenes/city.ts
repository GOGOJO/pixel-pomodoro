import { drawCat, drawCharacter, type CharacterLook } from "./character";
import {
  bands, circle, dither, ellipse, hash, hline, px, rect, rng, steam, vline,
  type Ctx, type SceneDef, type SceneEnv, type TimeOfDay,
} from "./pixel";

const C = {
  ink: "#141222",
  wall: "#34304a",
  wallDark: "#2a273e",
  wallLight: "#3e3a56",
  floor: "#3a3246",
  floorDark: "#2e283a",
  floorLight: "#463c54",
  frame: "#22202e",
  frameLight: "#4a4660",
  desk: "#4a3a3a",
  deskLight: "#6a5250",
  rug: "#2e5a64",
  rugDark: "#244850",
  monitor: "#1c1a26",
  plant: "#4a8a6a",
  plantDark: "#346650",
};

const SKY: Record<TimeOfDay, string[]> = {
  day: ["#6ea4d0", "#80b2d8", "#94c0de", "#a8cee4", "#bcdae8"],
  dusk: ["#2e2a5a", "#56407a", "#8a4e82", "#c4607a", "#ee9070"],
  night: ["#080a1a", "#0c1024", "#10162e", "#151c38", "#1c2442"],
};
const CITY: Record<TimeOfDay, { far: string; mid: string; near: string; winOff: string; winOn: string[]; bridge: string }> = {
  day: { far: "#8eaac4", mid: "#6a86a2", near: "#4e6680", winOff: "#9ec0da", winOn: ["#bcd8ea"], bridge: "#3e4e62" },
  dusk: { far: "#5a4472", mid: "#40345e", near: "#2c2648", winOff: "#3a3058", winOn: ["#f0b070", "#e89060", "#f8d090"], bridge: "#221c38" },
  night: { far: "#161c34", mid: "#11162a", near: "#0b0f1f", winOff: "#171c32", winOn: ["#f0c070", "#e8a860", "#a8d8f0", "#f8e0a0"], bridge: "#0a0c18" },
};

const LOOK: CharacterLook = {
  id: "city",
  hair: "#d8d0e8",
  hairHi: "#f4f0ff",
  skin: "#e8b48e",
  skinShade: "#c98f6c",
  top: "#2e2a44",
  topShade: "#22203a",
  trim: "#e86a8a",
  pants: "#3a3a52",
  pantsShade: "#2c2c40",
  shoes: "#e86a8a",
  outline: C.ink,
  mug: "#e86a8a",
  headphones: "#e86a8a",
};
const CAT = { id: "city-cat", fur: "#e0a060", furShade: "#c08040", outline: C.ink };

const WIN = { x: 10, y: 14, w: 190, h: 110 };
const DESK_Y = 116;
const HAND = { x: 238, y: 114 };

interface Building { x: number; w: number; top: number; layer: 0 | 1 | 2 }
const buildings: Building[] = (() => {
  const r = rng(42);
  const list: Building[] = [];
  for (const [layer, minH, maxH, minW, maxW] of [
    [0, 40, 70, 10, 20],
    [1, 30, 60, 12, 24],
    [2, 20, 46, 16, 28],
  ] as const) {
    let x = WIN.x - 6;
    while (x < WIN.x + WIN.w) {
      const w = minW + Math.floor(r() * (maxW - minW));
      list.push({ x, w, top: 104 - (minH + Math.floor(r() * (maxH - minH))), layer });
      x += w + (layer === 0 ? 0 : Math.floor(r() * 4));
    }
  }
  return list;
})();

function back(ctx: Ctx, e: SceneEnv) {
  const pal = CITY[e.tod];
  bands(ctx, 0, 0, 210, 130, SKY[e.tod]);
  const r = rng(13);
  if (e.tod === "night") {
    for (let i = 0; i < 40; i++) px(ctx, WIN.x + r() * WIN.w, WIN.y + r() * 40, r() > 0.8 ? "#f0ecd8" : "#4a5480");
    circle(ctx, 160, 34, 7, "#f4f0dc");
    circle(ctx, 158, 33, 2, "#d8d4c0");
    px(ctx, 162, 37, "#d8d4c0");
  } else if (e.tod === "dusk") {
    circle(ctx, 60, 86, 12, "#ffc890");
  } else {
    for (const [cx, cy, w] of [[50, 34, 14], [130, 26, 18], [176, 46, 10]]) {
      ellipse(ctx, cx, cy, w, 3, "#e8f2f8");
      ellipse(ctx, cx + 5, cy - 2, w / 2, 2, "#f8fcff");
    }
  }
  const colors = [pal.far, pal.mid, pal.near];
  for (const b of buildings) {
    rect(ctx, b.x, b.top, b.w, 110 - b.top + 20, colors[b.layer]);
    if (b.layer === 2 && b.w > 20) {
      rect(ctx, b.x + b.w / 2 - 1, b.top - 8, 2, 8, colors[2]);
    }
    if (b.layer >= 1) {
      const rr = rng(b.x * 7 + b.layer);
      for (let y = b.top + 3; y < 104; y += 4) {
        for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) {
          const on = rr() < (e.tod === "day" ? 0 : b.layer === 2 ? 0.35 : 0.25);
          const c = on ? pal.winOn[Math.floor(rr() * pal.winOn.length)] : pal.winOff;
          px(ctx, x, y, c);
          if (b.layer === 2) px(ctx, x + 1, y, c);
        }
      }
    }
  }
  // Elevated highway.
  rect(ctx, WIN.x, 104, WIN.w, 4, pal.bridge);
  hline(ctx, WIN.x, 103, WIN.w, e.tod === "day" ? "#6a7a8e" : "#2a2a44");
  for (let x = WIN.x + 8; x < WIN.x + WIN.w; x += 30) rect(ctx, x, 108, 3, 20, pal.bridge);
  rect(ctx, WIN.x, 110, WIN.w, 20, e.tod === "day" ? "#5a6a80" : pal.near);
}

function backAnim(ctx: Ctx, e: SceneEnv) {
  const night = e.tod !== "day";
  // Traffic: headlights heading right, taillights heading left.
  for (let i = 0; i < 7; i++) {
    const dir = i % 2 ? 1 : -1;
    const speed = 18 + hash(i) * 14;
    const span = WIN.w + 20;
    let x = (hash(i + 3) * span + e.t * speed) % span;
    if (dir < 0) x = span - x;
    x += WIN.x - 10;
    const y = dir > 0 ? 105 : 106;
    if (x < WIN.x || x > WIN.x + WIN.w - 3) continue;
    if (night) {
      const c = dir > 0 ? "#fff4c8" : "#ff5a5a";
      px(ctx, x, y, c);
      px(ctx, x + 2, y, c);
    } else {
      rect(ctx, x, y - 1, 4, 2, ["#c84a4a", "#e8e8f0", "#3a5a8a", "#e8c050"][i % 4]);
    }
  }
  if (!night) return;
  // Twinkling windows.
  for (let i = 0; i < 14; i++) {
    const b = buildings[Math.floor(hash(i + 50) * buildings.length)];
    if (b.layer < 1) continue;
    const x = b.x + 2 + Math.floor(hash(i + 60) * Math.max(1, (b.w - 4) / 3)) * 3;
    const y = b.top + 3 + Math.floor(hash(i + 70) * Math.max(1, (104 - b.top - 3) / 4)) * 4;
    if (Math.sin(e.t * 0.4 + i * 2.1) > 0.3) px(ctx, x, y, "#f8e0a0");
  }
  // Aircraft warning lights.
  const blink = Math.floor(e.t * 1.2) % 2 === 0;
  for (const b of buildings) {
    if (b.layer === 2 && b.w > 20 && blink) px(ctx, b.x + b.w / 2 - 1, b.top - 9, "#ff4a4a");
  }
  // Neon sign.
  const neonOn = Math.sin(e.t * 0.9) > -0.85 && !(e.t % 11 < 0.3);
  const nb = buildings.find((b) => b.layer === 2 && b.x > 110)!;
  rect(ctx, nb.x + 2, nb.top + 6, 12, 5, neonOn ? "#ff5aa8" : "#4a2a44");
  rect(ctx, nb.x + 3, nb.top + 7, 10, 3, neonOn ? "#ffd0e8" : "#3a2234");
  // A train crossing the far bridge occasionally.
  const tp = (e.t % 40) / 40;
  if (tp < 0.3) {
    const tx = WIN.x + (tp / 0.3) * (WIN.w + 60) - 50;
    for (let k = 0; k < 40; k += 2) {
      const x = tx + k;
      if (x > WIN.x && x < WIN.x + WIN.w) px(ctx, x, 98, k % 4 ? "#a8d8f0" : "#506080");
    }
  }
}

function room(ctx: Ctx) {
  rect(ctx, 0, 0, 320, 128, C.wall);
  for (let y = 0; y < 128; y += 16) hline(ctx, 200, y, 120, C.wallDark);
  for (let x = 208; x < 320; x += 24) vline(ctx, x, 0, 126, C.wallDark);
  rect(ctx, 0, 124, 320, 4, C.ink);
  rect(ctx, 0, 128, 320, 52, C.floor);
  for (let y = 128; y < 180; y += 5) {
    hline(ctx, 0, y, 320, C.floorDark);
    const off = ((y / 5) % 4) * 17;
    for (let x = off; x < 320; x += 64) vline(ctx, x, y, 5, C.floorDark);
  }
  dither(ctx, 0, 128, 320, 3, C.ink);
  // Rug.
  rect(ctx, 150, 146, 140, 26, C.ink);
  rect(ctx, 151, 147, 138, 24, C.rug);
  rect(ctx, 155, 150, 130, 18, C.rugDark);
  rect(ctx, 157, 152, 126, 14, C.rug);
}

function windowFrame(ctx: Ctx) {
  const { x, y, w, h } = WIN;
  rect(ctx, x - 6, y - 6, w + 12, h + 8, C.frame);
  rect(ctx, x - 6, y - 6, w + 12, 2, C.frameLight);
  for (const mx of [x + 63, x + 127]) {
    rect(ctx, mx - 1, y, 3, h, C.frame);
    vline(ctx, mx - 1, y, h, C.frameLight);
  }
  rect(ctx, x, y + 80, w, 2, C.frame);
  // Low sill / window bench with cushion.
  rect(ctx, x - 6, y + h, w + 12, 4, C.frameLight);
  hline(ctx, x - 6, y + h + 3, w + 12, C.ink);
  ellipse(ctx, 152, 134, 14, 3, C.ink);
  ellipse(ctx, 152, 133, 13, 3, "#7a5aa0");
  dither(ctx, 142, 132, 20, 2, "#9a7ac0", true);
}

function desk(ctx: Ctx) {
  // Shelf with records and a figure.
  rect(ctx, 238, 50, 76, 3, C.deskLight);
  hline(ctx, 238, 53, 76, C.ink);
  const recs = ["#e86a8a", "#5ad0c8", "#f0c070", "#8a7ad8", "#e8e8f0"];
  for (let i = 0; i < 10; i++) {
    rect(ctx, 270 + i * 4, 38, 3, 12, C.ink);
    rect(ctx, 270 + i * 4, 39, 2, 11, recs[i % recs.length]);
  }
  rect(ctx, 246, 42, 6, 8, C.ink);
  rect(ctx, 247, 43, 4, 7, "#f0c070");
  px(ctx, 248, 45, C.ink); px(ctx, 250, 45, C.ink);
  // Poster.
  rect(ctx, 284, 64, 26, 34, C.ink);
  rect(ctx, 285, 65, 24, 32, "#e86a8a");
  circle(ctx, 297, 76, 6, "#f8d0a0");
  rect(ctx, 285, 84, 24, 13, "#5a3a7a");
  for (let i = 0; i < 6; i++) rect(ctx, 286 + i * 4, 82 - (i % 3) * 3, 3, 6 + (i % 3) * 3, "#2a1a44");
  // Gaming chair.
  // Gaming chair: tall pink-trimmed back on a single post.
  const cx = HAND.x - 18, seatY = HAND.y + 6;
  rect(ctx, cx - 1, seatY - 26, 6, 28, C.ink);
  rect(ctx, cx, seatY - 25, 4, 26, "#e86a8a");
  vline(ctx, cx + 1, seatY - 23, 22, "#2e2a44");
  rect(ctx, cx, seatY, 22, 4, C.ink);
  rect(ctx, cx + 1, seatY + 1, 20, 2, "#2e2a44");
  rect(ctx, cx + 10, seatY + 4, 2, 6, C.ink);
  hline(ctx, cx + 3, seatY + 9, 16, C.ink);
  // Desk.
  rect(ctx, 202, DESK_Y, 116, 5, C.ink);
  rect(ctx, 203, DESK_Y + 1, 115, 3, C.deskLight);
  hline(ctx, 203, DESK_Y + 3, 115, C.desk);
  // Keyboard.
  rect(ctx, 232, DESK_Y - 2, 18, 2, C.ink);
  for (let x = 233; x < 249; x += 2) px(ctx, x, DESK_Y - 2, "#5a5670");
  // Monitor (side view) on an arm.
  rect(ctx, 262, DESK_Y - 3, 10, 3, C.ink);
  vline(ctx, 267, DESK_Y - 14, 11, C.ink);
  rect(ctx, 260, DESK_Y - 36, 5, 24, C.ink);
  vline(ctx, 265, DESK_Y - 30, 12, C.ink);
  // Desk plant, mug and lava lamp base.
  rect(ctx, 282, DESK_Y - 7, 8, 7, C.ink);
  rect(ctx, 283, DESK_Y - 6, 6, 6, "#e8e8f0");
  for (let i = 0; i < 7; i++) px(ctx, 282 + i, DESK_Y - 9 - (i % 3) - (i === 3 ? 3 : 0), i % 2 ? C.plant : C.plantDark);
  rect(ctx, 252, DESK_Y - 6, 6, 6, C.ink);
  rect(ctx, 253, DESK_Y - 5, 4, 5, "#e86a8a");
  px(ctx, 258, DESK_Y - 4, C.ink);
  rect(ctx, 298, DESK_Y - 4, 10, 4, C.ink);
  rect(ctx, 299, DESK_Y - 3, 8, 2, "#8a8aa0");
  rect(ctx, 300, DESK_Y - 26, 6, 2, C.ink);
  rect(ctx, 299, DESK_Y - 24, 8, 20, C.ink);
}

function front(ctx: Ctx) {
  room(ctx);
  windowFrame(ctx);
  desk(ctx);
}

function frontAnim(ctx: Ctx, e: SceneEnv) {
  drawCat(ctx, 142, 126, CAT, e.t, true);
  drawCharacter(ctx, HAND.x, HAND.y, { look: LOOK, activity: e.activity, t: e.t });
  steam(ctx, 254, DESK_Y - 7, e.t, "#c8c0d8", 6);
}

function fore(ctx: Ctx) {
  rect(ctx, 204, DESK_Y + 4, 4, 9, C.ink);
  rect(ctx, 310, DESK_Y + 4, 4, 9, C.ink);
  rect(ctx, 274, DESK_Y + 4, 34, 6, C.ink);
  rect(ctx, 275, DESK_Y + 4, 32, 5, C.desk);
  // Monstera in the corner.
  rect(ctx, 4, 162, 20, 18, C.ink);
  rect(ctx, 5, 163, 18, 17, "#d8d0e8");
  hline(ctx, 5, 165, 18, "#b0a8c4");
  const r = rng(77);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
    const len = 14 + r() * 10;
    for (let k = 0; k < len; k++) px(ctx, 14 + Math.cos(a) * k, 162 + Math.sin(a) * k, C.plantDark);
    ellipse(ctx, 14 + Math.cos(a) * len, 162 + Math.sin(a) * len, 4, 3, C.plant);
    px(ctx, 14 + Math.cos(a) * len, 162 + Math.sin(a) * len, C.plantDark);
  }
}

function glowAnim(ctx: Ctx, e: SceneEnv) {
  const working = e.activity === "focus";
  // Monitor face toward the character.
  for (let y = DESK_Y - 35; y < DESK_Y - 13; y++) {
    const c = working ? (Math.floor(e.t * 2 + y) % 7 === 0 ? "#d0f0ff" : "#7ac0f0") : "#4a6a9a";
    px(ctx, 259, y, c);
  }
  // Lava lamp blobs.
  const lx = 300, ly = DESK_Y - 23;
  rect(ctx, lx, ly, 6, 18, "#5a2a5a");
  for (let i = 0; i < 3; i++) {
    const p = (Math.sin(e.t * 0.5 + i * 2.1) + 1) / 2;
    const y = ly + 2 + p * 13;
    rect(ctx, lx + 1 + (i % 2), y, 3 + (i === 1 ? 1 : 0), 2 + (i % 2), "#ff7ab0");
  }
  rect(ctx, lx + 1, ly + 16, 4, 2, "#ff9ac8");
  // RGB strip under the desk.
  if (e.tod !== "day") {
    for (let x = 206; x < 316; x += 2) {
      const hue = (x * 3 + e.t * 60) % 360;
      ctx.fillStyle = `hsl(${hue} 70% 62%)`;
      ctx.fillRect(x, DESK_Y + 5, 1, 1);
    }
  }
}

export const city: SceneDef = {
  id: "city",
  name: "Night City",
  blurb: "Lo-fi beats above the glittering skyline.",
  swatch: ["#151c38", "#e86a8a", "#5ad0c8", "#f0c070"],
  back,
  backAnim,
  front,
  frontAnim,
  fore,
  glowAnim,
  windows: [WIN],
  lights: (e) => [
    { x: 254, y: DESK_Y - 22, r: e.activity === "focus" ? 40 : 28, color: "#6ab0ff" },
    { x: 303, y: DESK_Y - 14, r: 24, color: "#ff6aa8", nightOnly: true },
    { x: 260, y: DESK_Y + 8, r: 36, color: "#a07ae8", nightOnly: true },
  ],
  shade: { day: "rgba(30,25,50,0.12)", dusk: "rgba(40,20,60,0.35)", night: "rgba(6,6,20,0.62)" },
};
