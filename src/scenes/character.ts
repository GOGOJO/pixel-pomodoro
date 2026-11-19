import { blit, cached, outline, makeCanvas, px, sprite, type Activity, type Ctx } from "./pixel";

export interface CharacterLook {
  id: string;
  hair: string;
  hairHi: string;
  skin: string;
  skinShade: string;
  top: string;
  topShade: string;
  trim: string;
  pants: string;
  pantsShade: string;
  shoes: string;
  outline: string;
  mug: string;
  headphones?: string;
}

const HEAD = [
  "....hhhhhh...",
  "..hhhHHHHhh..",
  ".hhhHHhhhhhh.",
  "hhhhhhhhhhhhh",
  "hhhhhhhhsshhh",
  "hhhhhhhssssh.",
  "hhhhhSsssseSs",
  "hhhhhSsssssss",
  ".hhhhSsssbss.",
  ".hhhh.Sssss..",
  "..hh...SSs...",
];

const BODY = [
  "...cccccc........",
  "..ccccccccc......",
  ".cccccccccc......",
  ".ccCcccccccc.....",
  ".ccCccccccccc....",
  ".ccCcccccccc.....",
  ".ccCcccccccc.....",
  ".cCCcccccccc.....",
  ".cCCccccccccc....",
  ".tttttttttttt....",
  ".pppppppppppppp..",
  ".PPpppppppppppp..",
  "..PPPPPPPPPPpppp.",
  "............ppp..",
  "............ppp..",
  "............ppp..",
  "............Ppp..",
  "............PPp..",
  "...........wwwwww",
  "...........wwwww.",
];

// Arm reaching forward to a desk; origin is the shoulder.
const ARM_TYPE = [
  ".oooo..........",
  "occcco.........",
  "occCco.........",
  "occCco.........",
  "occCcooooooooo.",
  "occCccccccccco.",
  ".oCCCCCCCCCCCo.",
  "..ooooooooooo..",
];

// Arm lifting a mug to the mouth; origin row 6 is the shoulder.
const ARM_DRINK = [
  "........oooooo",
  "........ommmmo",
  "........ommmmoo",
  ".......sommmmo.o",
  "......ssommmmoo",
  "......so.oooo.",
  ".oooo.co......",
  "occccoco......",
  "occCcoco......",
  "occCcCco......",
  "occCCCo.......",
  ".oCCCo........",
  "..ooo.........",
];

// Arms stretched overhead; origin row 10 is the shoulder.
const ARM_STRETCH = [
  "....ss....",
  "...osso...",
  "...occo...",
  "..occo....",
  "..occo....",
  ".occo.....",
  ".occo.....",
  "occCo.....",
  "occCo.....",
  "occCo.....",
  "occCo.....",
  "occCo.....",
  "occCo.....",
  ".oCo......",
  "..o.......",
];

const pal = (l: CharacterLook): Record<string, string> => ({
  h: l.hair,
  H: l.hairHi,
  s: l.skin,
  S: l.skinShade,
  e: l.outline,
  b: "#e8857a",
  c: l.top,
  C: l.topShade,
  t: l.trim,
  p: l.pants,
  P: l.pantsShade,
  w: l.shoes,
  o: l.outline,
  m: l.mug,
});

export type Pose = "type" | "write" | "drink" | "stretch" | "rest" | "nod";

export function poseFor(activity: Activity, t: number): Pose {
  if (activity === "focus") return "type";
  if (activity === "longBreak") return Math.floor(t / 7) % 3 === 0 ? "stretch" : "drink";
  if (activity === "break") return Math.floor(t / 6) % 4 === 3 ? "stretch" : "drink";
  if (activity === "paused") return "rest";
  return "rest";
}

/** Composite character frame: 24 x 36 px. Hands rest at (HAND_X, HAND_Y) in the frame. */
export const HAND_X = 19;
export const HAND_Y = 20;
export const CHAR_W = 26;
export const CHAR_H = 38;

function frame(look: CharacterLook, pose: Pose, blink: boolean, headDy: number, handDy: number, writing: boolean) {
  const key = `char:${look.id}:${pose}:${blink}:${headDy}:${handDy}:${writing}`;
  return cached(key, CHAR_W, CHAR_H, (ctx) => {
    const P = pal(look);
    const [base, b] = makeCanvas(CHAR_W, CHAR_H);
    const headRows = blink ? HEAD.map((r) => r.replace("e", "S")) : HEAD;
    blit(b, sprite(`body:${look.id}`, BODY, P), 3, 13);
    if (pose === "nod") {
      blit(b, sprite(`head:${look.id}:${blink}`, headRows, P), 3, 3 + headDy);
    } else {
      blit(b, sprite(`head:${look.id}:${blink}`, headRows, P), 2, 2 + headDy);
    }
    if (look.headphones) {
      const hp = look.headphones;
      for (let x = 4; x <= 10; x++) px(b, x, 1 + headDy, hp);
      px(b, 3, 2 + headDy, hp);
      px(b, 11, 2 + headDy, hp);
      for (let y = 6; y <= 9; y++) {
        px(b, 6, y + headDy, hp);
        px(b, 7, y + headDy, hp);
      }
      px(b, 5, 7 + headDy, hp);
    }
    const out = outline(base, look.outline);
    ctx.drawImage(out, 0, 0);
    const sx = 5, sy = 15;
    if (pose === "type" || pose === "write" || pose === "rest" || pose === "nod") {
      blit(ctx, sprite(`armT:${look.id}`, ARM_TYPE, P), sx, sy);
      const hx = sx + 13, hy = sy + 5 + handDy;
      px(ctx, hx, hy, look.skin);
      px(ctx, hx + 1, hy, look.skin);
      px(ctx, hx, hy + 1, look.skinShade);
      px(ctx, hx + 1, hy + 1, look.skin);
      px(ctx, hx + 2, hy, look.outline);
      px(ctx, hx + 2, hy + 1, look.outline);
      if (writing) {
        px(ctx, hx + 1, hy - 1, "#e0b04a");
        px(ctx, hx + 2, hy - 2, "#e0b04a");
        px(ctx, hx + 3, hy - 3, "#e8857a");
        px(ctx, hx, hy + 2, "#3a3a3a");
      }
    } else if (pose === "drink") {
      blit(ctx, sprite(`armD:${look.id}`, ARM_DRINK, P), sx + 1, sy - 6);
    } else if (pose === "stretch") {
      blit(ctx, sprite(`armS:${look.id}`, ARM_STRETCH, P), sx + 2, sy - 10);
    }
  });
}

export interface DrawCharacterOpts {
  look: CharacterLook;
  activity: Activity;
  t: number;
  writing?: boolean;
  flip?: boolean;
}

/** Draws the seated character so that the hands land on (handX, handY). */
export function drawCharacter(ctx: Ctx, handX: number, handY: number, o: DrawCharacterOpts) {
  const { look, activity, t } = o;
  const pose = poseFor(activity, t);
  const blink = t % 4.3 < 0.15 || (t + 1.7) % 9.1 < 0.12;
  let headDy = 0;
  let handDy = 0;
  if (pose === "type") {
    headDy = Math.floor(t / 1.6) % 5 === 0 ? 1 : 0;
    const f = Math.floor(t * 9);
    handDy = (f * 7919) % 5 < 2 ? 1 : 0;
    if (o.writing) handDy = Math.floor(t * 4) % 2;
  } else if (pose === "rest") {
    headDy = activity === "paused" && t % 6 > 3 ? 1 : 0;
  } else if (pose === "drink") {
    headDy = t % 6 < 3 ? 0 : 1;
  }
  const img = frame(look, pose, blink, headDy, handDy, !!o.writing && pose === "type");
  const x = handX - HAND_X;
  const y = handY - HAND_Y;
  blit(ctx, img, o.flip ? handX - (CHAR_W - HAND_X) : x, y, o.flip);
}

/** Small sleeping/sitting cat. */
const CAT_BODY = [
  "..........oo..",
  "...oooooooko..",
  "..okkkkkkkkko.",
  ".okkkkkkkkkkko",
  ".okKKkkkkkkkko",
  "..oooooooooo..",
];

export interface CatLook {
  id: string;
  fur: string;
  furShade: string;
  outline: string;
}

export function drawCat(ctx: Ctx, x: number, y: number, look: CatLook, t: number, flip = false) {
  const P = { o: look.outline, k: look.fur, K: look.furShade };
  const breathe = Math.floor(t * 1.2) % 2;
  const body = sprite(`cat:${look.id}`, CAT_BODY, P);
  ctx.save();
  if (flip) {
    ctx.translate(x * 2 + 16, 0);
    ctx.scale(-1, 1);
  }
  blit(ctx, body, x, y + 1 - breathe * 0);
  if (breathe) px(ctx, x + 6, y + 1, look.outline);
  // Head with ears.
  const hx = x + 10, hy = y;
  ctx.fillStyle = look.outline;
  ctx.fillRect(hx, hy, 6, 5);
  ctx.fillStyle = look.fur;
  ctx.fillRect(hx + 1, hy + 1, 4, 3);
  px(ctx, hx, hy - 1, look.outline);
  px(ctx, hx + 5, hy - 1, look.outline);
  px(ctx, hx + 2, hy + 2, look.outline);
  px(ctx, hx + 4, hy + 2, look.outline);
  // Tail swish.
  const swish = Math.round(Math.sin(t * 1.6) * 1.5);
  ctx.fillStyle = look.outline;
  ctx.fillRect(x - 1, y + 4, 2, 1);
  ctx.fillRect(x - 3, y + 3 + swish, 2, 1);
  ctx.fillRect(x - 2, y + 4 + Math.max(0, swish), 1, 1);
  ctx.restore();
}
