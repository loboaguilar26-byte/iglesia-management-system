import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "./errors";

// Almacenamiento local de archivos subidos (ADR-011). Se puede sustituir por S3/R2 sin tocar los módulos.
const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "uploads");

const IMAGE_TYPES = [
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "webp", mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
] as const;

export const MAX_IMAGE_BYTES = 1024 * 1024;

/** Detecta el tipo real por su firma (no por la extensión ni el tipo declarado). */
export function detectImage(bytes: Uint8Array) {
  return IMAGE_TYPES.find(
    (t) =>
      t.magic.every((b, i) => bytes[i] === b) &&
      (!("extra" in t) || t.extra.bytes.every((b, i) => bytes[t.extra.offset + i] === b)),
  );
}

export async function saveImage(file: File, prefix: string): Promise<string> {
  if (file.size === 0) throw new AppError("VALIDATION_ERROR", "Selecciona una imagen.");
  if (file.size > MAX_IMAGE_BYTES) throw new AppError("VALIDATION_ERROR", "La imagen no debe superar 1 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImage(bytes);
  if (!type) throw new AppError("VALIDATION_ERROR", "Formato no permitido. Usa PNG, JPG o WebP.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${prefix}-${randomUUID()}.${type.ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), bytes);
  return name;
}

/** Lee un archivo guardado; el nombre se valida para impedir rutas fuera del directorio. */
export async function readStored(name: string) {
  if (!/^[\w-]+\.(png|jpg|webp)$/.test(name)) return null;
  try {
    const bytes = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    const type = detectImage(bytes);
    return type ? { bytes, mime: type.mime } : null;
  } catch {
    return null;
  }
}

export async function deleteStored(name: string | null | undefined) {
  if (!name || !/^[\w-]+\.(png|jpg|webp)$/.test(name)) return;
  await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)).catch(() => undefined);
}
