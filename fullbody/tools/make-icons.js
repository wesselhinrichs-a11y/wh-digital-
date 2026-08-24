// Genereert de PNG-iconen voor de PWA, zonder externe libraries.
// Draait met: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');

const GROUND = [0x0e, 0x12, 0x16];
const ACCENT = [0xff, 0x8a, 0x3d];

// Halter, uitgedrukt in een raster van 64x64 (zelfde vorm als favicon.svg).
const BAR = [
  { x: 20, y: 29, w: 24, h: 6, r: 3 },
  { x: 13, y: 22, w: 7, h: 20, r: 3.5 },
  { x: 44, y: 22, w: 7, h: 20, r: 3.5 },
  { x: 6, y: 26, w: 5, h: 12, r: 2.5 },
  { x: 53, y: 26, w: 5, h: 12, r: 2.5 },
];

function inRoundedRect(px, py, r) {
  const { x, y, w, h } = r;
  const rad = Math.min(r.r, w / 2, h / 2);
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + rad), x + w - rad);
  const cy = Math.min(Math.max(py, y + rad), y + h - rad);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rad * rad;
}

// size = pixels, markScale = deel van het vlak dat de halter mag innemen,
// corner = hoekradius van de achtergrond (0 = vierkant, voor maskable/apple).
function drawIcon(size, markScale, corner) {
  const SS = 4; // supersampling voor gladde randen
  const data = Buffer.alloc(size * size * 4);
  const scale = (size * markScale) / 64;
  const offset = (size - 64 * scale) / 2;
  const bgRect = { x: 0, y: 0, w: size, h: size, r: corner };

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bg = 0;
      let mark = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const fx = px + (sx + 0.5) / SS;
          const fy = py + (sy + 0.5) / SS;
          if (corner > 0 && !inRoundedRect(fx, fy, bgRect)) continue;
          bg += 1;
          const ux = (fx - offset) / scale;
          const uy = (fy - offset) / scale;
          if (BAR.some((r) => inRoundedRect(ux, uy, r))) mark += 1;
        }
      }
      const total = SS * SS;
      const alpha = corner > 0 ? bg / total : 1;
      const m = mark / total;
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c += 1) {
        data[i + c] = Math.round(GROUND[c] * (1 - m) + ACCENT[c] * m);
      }
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  return data;
}

/* ---- minimale PNG-encoder ---- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bitdiepte
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ICONS = [
  { file: 'icon-192.png', size: 192, mark: 0.74, corner: 42 },
  { file: 'icon-512.png', size: 512, mark: 0.74, corner: 112 },
  { file: 'icon-maskable-512.png', size: 512, mark: 0.52, corner: 0 },
  { file: 'apple-touch-icon.png', size: 180, mark: 0.72, corner: 0 },
];

fs.mkdirSync(OUT, { recursive: true });
ICONS.forEach(({ file, size, mark, corner }) => {
  const png = encodePng(size, drawIcon(size, mark, corner));
  fs.writeFileSync(path.join(OUT, file), png);
  console.log(file, size + 'px', (png.length / 1024).toFixed(1) + ' KB');
});
