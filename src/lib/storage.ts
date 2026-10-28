import { randomUUID } from "node:crypto";
import { db } from "./db";
import { AppError } from "./errors";

// Archivos subidos pequeños (logotipo) guardados en la base de datos (ADR-011): funciona igual en
// local y en servidores sin disco persistente (Firebase App Hosting / Cloud Run).

const IMAGE_TYPES = [
  { ext: "png", mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { ext: "webp", mime: "image/webp", magic: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
] as const;

const MAX_IMAGE_BYTES = 1024 * 1024;
const NAME_PATTERN = /^[\w-]+\.(png|jpg|webp)$/;

/** Detecta el tipo real por su firma (no por la extensión ni el tipo declarado). */
function detectImage(bytes: Uint8Array) {
  return IMAGE_TYPES.find(
    (t) =>
      t.magic.every((b, i) => bytes[i] === b) &&
      (!("extra" in t) || t.extra.bytes.every((b, i) => bytes[t.extra.offset + i] === b)),
  );
}

export async function saveImage(file: File, prefix: string, maxBytes = MAX_IMAGE_BYTES): Promise<string> {
  if (file.size === 0) throw new AppError("VALIDATION_ERROR", "Selecciona una imagen.");
  if (file.size > maxBytes) throw new AppError("VALIDATION_ERROR", `La imagen no debe superar ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImage(bytes);
  if (!type) throw new AppError("VALIDATION_ERROR", "Formato no permitido. Usa PNG, JPG o WebP.");
  const name = `${prefix}-${randomUUID()}.${type.ext}`;
  await db.storedFile.create({ data: { name, mime: type.mime, data: bytes } });
  return name;
}

/** Lee un archivo guardado; el nombre se valida antes de consultar. */
export async function readStored(name: string) {
  if (!NAME_PATTERN.test(name)) return null;
  const file = await db.storedFile.findUnique({ where: { name } });
  if (!file) return null;
  const bytes = new Uint8Array(file.data);
  const type = detectImage(bytes);
  return type ? { bytes, mime: type.mime } : null;
}

export async function deleteStored(name: string | null | undefined) {
  if (!name || !NAME_PATTERN.test(name)) return;
  await db.storedFile.delete({ where: { name } }).catch(() => undefined);
}
