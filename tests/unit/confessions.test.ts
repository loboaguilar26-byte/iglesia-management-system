import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/authz";
import type { Permission } from "@/lib/permissions";
import { decryptConfessionValue, encryptConfessionValue } from "@/modules/confessions/crypto";
import { listConfessions } from "@/modules/confessions/service";

describe("cifrado de confesiones", () => {
  beforeEach(() => {
    vi.stubEnv("CONFESSIONS_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("cifra y descifra texto usando un IV nuevo", () => {
    const first = encryptConfessionValue("Mensaje reservado");
    const second = encryptConfessionValue("Mensaje reservado");
    expect(decryptConfessionValue(first)).toBe("Mensaje reservado");
    expect(first.iv).not.toBe(second.iv);
  });

  it("rechaza datos alterados", () => {
    const encrypted = encryptConfessionValue("Mensaje reservado");
    const first = encrypted.ciphertext[0] === "A" ? "B" : "A";
    const changed = { ...encrypted, ciphertext: `${first}${encrypted.ciphertext.slice(1)}` };
    expect(() => decryptConfessionValue(changed)).toThrow();
  });

  it("falla explícitamente si falta la clave", () => {
    vi.stubEnv("CONFESSIONS_ENCRYPTION_KEY", "");
    expect(() => encryptConfessionValue("Mensaje reservado")).toThrow(/CONFESSIONS_ENCRYPTION_KEY/);
  });
});

describe("autorización de confesiones", () => {
  const nonPriest: Actor = {
    userId: "user-1",
    name: "Usuario",
    email: "user@example.test",
    roles: ["PASTOR"],
    permissions: new Set<Permission>(["confessions:read"]),
  };
  const priestWithoutPermission: Actor = {
    ...nonPriest,
    roles: ["PRIEST"],
    permissions: new Set<Permission>(),
  };

  it("rechaza a usuarios sin el rol Sacerdote incluso si tienen el permiso", async () => {
    await expect(listConfessions(nonPriest)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requiere también el permiso de lectura para el rol Sacerdote", async () => {
    await expect(listConfessions(priestWithoutPermission)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("límite de envíos públicos", () => {
  it("bloquea por origen sin guardar la IP y amplía el límite sin IP", async () => {
    const { throttle } = await import("@/lib/throttle");
    const opts = { max: 2, windowMs: 60_000 };
    throttle("prueba", "203.0.113.5", opts);
    throttle("prueba", "203.0.113.5", opts);
    expect(() => throttle("prueba", "203.0.113.5", opts)).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => throttle("prueba", "203.0.113.9", opts)).not.toThrow();
    for (let i = 0; i < 20; i++) throttle("prueba-sin-ip", null, opts);
    expect(() => throttle("prueba-sin-ip", null, opts)).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });
});
