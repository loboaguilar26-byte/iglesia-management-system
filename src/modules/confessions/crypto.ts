import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedValue = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function encryptionKey() {
  const encoded = process.env.CONFESSIONS_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("Configura CONFESSIONS_ENCRYPTION_KEY para habilitar el módulo de confesiones.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("CONFESSIONS_ENCRYPTION_KEY debe ser una clave base64 válida de 32 bytes.");
  }
  return key;
}

export function encryptConfessionValue(value: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptConfessionValue(value: EncryptedValue): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
