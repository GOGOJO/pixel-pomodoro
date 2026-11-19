// Generates app-icon.png (1024x1024) from a procedurally drawn 32x32 pixel-art tile.
// Run `npm run icons` to regenerate every platform icon from it.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const N = 32;
const SCALE = 32;
const P = {
  K: [26, 20, 36, 255],
  O: [70, 52, 92, 255],
  B: [50, 38, 72, 255],
  b: [40, 30, 58, 255],
  n: [33, 25, 48, 255],
  S: [255, 233, 168, 255],
  s: [190, 170, 210, 255],
  R: [217, 72, 59, 255],
  r: [163, 46, 43, 255],
  d: [120, 32, 38, 255],
  h: [255, 138, 107, 255],
  w: [255, 242, 214, 255],
  G: [111, 184, 82, 255],
  g: [61, 122, 53, 255],
  T: [126, 84, 56, 255],
  t: [92, 60, 42, 255],
};

const grid = Array.from({ length: N }, () => Array(N).fill(null));
const set = (x, y, c) => {
  if (x >= 0 && y >= 0 && x < N && y < N) grid[y][x] = c;
};

const inside = (x, y) => Math.abs(x - 15.5) ** 4 + Math.abs(y - 15.5) ** 4 <= 13.2 ** 4;
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (edge) set(x, y, "K");
    else {
      const rim = !inside(x - 2, y) || !inside(x, y - 2);
      if (rim) set(x, y, "O");
      else if (y < 12) set(x, y, "n");
      else if (y < 16) set(x, y, (x + y) % 2 === 0 ? "n" : "b");
      else if (y < 22) set(x, y, "b");
      else set(x, y, (x + y) % 2 === 0 ? "b" : "B");
    }
  }
}

for (const [x, y, c] of [
  [7, 6, "S"], [24, 8, "S"], [10, 10, "s"], [21, 5, "s"], [26, 13, "s"], [5, 12, "s"],
]) set(x, y, c);
set(24, 7, "s"); set(24, 9, "s"); set(23, 8, "s"); set(25, 8, "s");

// Desk the tomato sits on.
for (let x = 4; x < 28; x++) {
  if (grid[24][x] && grid[24][x] !== "K") set(x, 24, "T");
  for (let y = 25; y < 28; y++) if (grid[y][x] && grid[y][x] !== "K") set(x, y, "t");
}

const cx = 15.5, cy = 16.5, rx = 8.6, ry = 7.6;
const inTomato = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (!inTomato(x, y)) continue;
    const edge = !inTomato(x - 1, y) || !inTomato(x + 1, y) || !inTomato(x, y - 1) || !inTomato(x, y + 1);
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    let c = "R";
    if (dx + dy > 0.95) c = "d";
    else if (dx + dy > 0.45) c = "r";
    if (edge) c = "K";
    set(x, y, c);
  }
}
for (const [x, y, c] of [
  [10, 13, "h"], [11, 12, "h"], [12, 12, "h"], [10, 14, "h"], [11, 13, "w"], [9, 15, "h"],
]) set(x, y, c);

const leaves = [
  [15, 8, "K"], [16, 8, "K"], [15, 9, "g"], [16, 9, "g"],
  [12, 10, "K"], [13, 10, "G"], [14, 10, "G"], [15, 10, "G"], [16, 10, "G"], [17, 10, "G"], [18, 10, "G"], [19, 10, "K"],
  [11, 11, "K"], [12, 11, "G"], [13, 11, "g"], [14, 11, "G"], [15, 11, "g"], [16, 11, "g"], [17, 11, "G"], [18, 11, "g"], [19, 11, "G"], [20, 11, "K"],
  [13, 12, "K"], [14, 12, "g"], [15, 12, "K"], [16, 12, "K"], [17, 12, "g"], [18, 12, "K"],
  [17, 7, "K"], [17, 6, "K"],
];
for (const [x, y, c] of leaves) set(x, y, c);

const W = N * SCALE;
const raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) {
  const row = y * (W * 4 + 1);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    const c = grid[Math.floor(y / SCALE)][Math.floor(x / SCALE)];
    const rgba = c ? P[c] : [0, 0, 0, 0];
    raw.set(rgba, row + 1 + x * 4);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(W, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("../app-icon.png", import.meta.url), png);
console.log("wrote app-icon.png");
