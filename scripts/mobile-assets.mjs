// Genera los íconos y pantallas de inicio de Android e iOS a partir de los SVG de Eclaria.
// Reescribe cada imagen que crea Capacitor conservando su tamaño. Uso: pnpm mobile:assets
import { readdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// sharp llega con Next (binarios precompilados); se resuelve desde su paquete.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next/package.json"))] }));

const BG = "#2a170c";
const ICON = "public/eclaria-mark.svg";
const LOGO = "public/eclaria-logo.svg";
const ICON_PNG = "assets/icon-only.png";
const LOGO_PNG = "assets/logo.png";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".png")) yield full;
  }
}

async function size(file) {
  const { width, height } = await sharp(file).metadata();
  return { width, height };
}

/** Logo centrado sobre un fondo sólido (pantallas de inicio). */
async function splash(file, { width, height }) {
  const side = Math.round(Math.min(width, height) * 0.32);
  const logo = await sharp(ICON).resize(side, side).png().toBuffer();
  const img = await sharp({ create: { width, height, channels: 4, background: BG } }).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
  await writeFile(file, img);
}

/** Ícono cuadrado (o redondo) a sangre. */
async function icon(file, { width }, round = false) {
  let img = sharp(ICON).resize(width, width);
  if (round) {
    const mask = Buffer.from(`<svg width="${width}" height="${width}"><circle cx="${width / 2}" cy="${width / 2}" r="${width / 2}"/></svg>`);
    img = img.composite([{ input: mask, blend: "dest-in" }]);
  }
  await writeFile(file, await img.png().toBuffer());
}

/** Primer plano del ícono adaptativo de Android: la marca dentro de la zona segura (66 %). */
async function foreground(file, { width }) {
  const inner = Math.round(width * 0.62);
  const logo = await sharp(ICON).resize(inner, inner).png().toBuffer();
  const img = await sharp({ create: { width, height: width, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
  await writeFile(file, img);
}

await sharp(ICON).resize(1024, 1024).png().toFile(ICON_PNG);
await sharp(LOGO).resize(1024, 1024, {
  fit: "contain",
  background: { r: 0, g: 0, b: 0, alpha: 0 },
}).png().toFile(LOGO_PNG);

let count = 0;
for (const root of ["android/app/src/main/res", "ios/App/App/Assets.xcassets"]) {
  if (!(await stat(root).catch(() => null))) continue;
  for await (const file of walk(root)) {
    const name = path.basename(file);
    const dims = await size(file);
    if (name.startsWith("splash")) await splash(file, dims);
    else if (name === "ic_launcher_foreground.png") await foreground(file, dims);
    else if (name === "ic_launcher_round.png") await icon(file, dims, true);
    else if (name === "ic_launcher.png" || name.startsWith("AppIcon")) await icon(file, dims);
    else continue;
    count++;
  }
}
console.log(`Imágenes de la app móvil actualizadas: ${count}`);
