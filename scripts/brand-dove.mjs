// Recorta la paloma del emblema real (public/eclaria-icon.png) para la intro: public/intro/paloma.webp.
// Uso: pnpm brand:dove. Conserva los
// tonos claros y poco saturados (plumas blancas/crema) y descarta el fondo oscuro, el oro
// saturado, la cruz, el aro y el libro.
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next/package.json"))] }));

const box = { left: 110, top: 30, width: 880, height: 740 };
const { data, info } = await sharp(path.join(root, "public/eclaria-icon.png")).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const clamp = (v) => Math.max(0, Math.min(1, v));

// 1) Alfa por color: pluma = clara y poco saturada.
const alpha = new Float32Array(W * H);
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = max === 0 ? 0 : (max - min) / max;
  alpha[p] = clamp((lum - 0.42) / 0.28) * clamp(1 - (sat - 0.30) / 0.30);
}
const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : alpha[Math.round(y) * W + Math.round(x)]);

// 2) Aro dorado (centro 417,465; radio 440): en su banda solo se borran trazos delgados, es decir,
//    puntos con oscuridad 12 px hacia dentro y hacia fuera del círculo. Las plumas, que
//    son anchas, se conservan.
const CX = 417, CY = 465, R = 440;
const out = new Float32Array(alpha);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    const d = Math.hypot(x - CX, y - CY);
    if (Math.abs(d - R) < 75 && alpha[p] > 0) {
      const ux = (x - CX) / d, uy = (y - CY) / d;
      const inner = at(x - ux * 12, y - uy * 12), outer = at(x + ux * 12, y + uy * 12);
      if (Math.max(inner, outer) < 0.25) out[p] = 0;
    }
    // Cruz detrás de la paloma (barra vertical por encima del cuello y brazo horizontal).
    if (x >= 368 && x <= 444 && y >= 70 && y <= 392) out[p] = 0;
    if (x >= 260 && x <= 552 && y >= 172 && y <= 246) out[p] = 0;
    if (((x >= 372 && x <= 390) || (x >= 418 && x <= 434)) && y > 392 && y <= 418) out[p] = 0;
    // Parte alta del aro (doble línea, sin plumas debajo) y destellos sueltos junto al ala derecha.
    if (x >= 200 && x <= 640 && y <= 95) out[p] = 0;
    if (x >= 745 && x <= 798 && y >= 218 && y <= 266) out[p] = 0;
    if (x >= 852 && y >= 420 && y <= 474) out[p] = 0;
    // Libro y destello inferior: se desvanece hacia abajo, como si la paloma saliera de la luz.
    out[p] *= clamp((668 - y) / 70);
  }
}
for (let p = 0; p < W * H; p++) data[p * 4 + 3] = Math.round(out[p] * 255);

const file = path.join(root, "public/intro/paloma.webp");
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(file);
console.log(`Paloma de la intro: ${path.relative(root, file)} (${W}×${H})`);
