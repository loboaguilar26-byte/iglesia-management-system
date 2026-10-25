import { describe, expect, it } from "vitest";
import { can, requirePermission, type Actor } from "@/lib/authz";
import { formatDate, formatDateTime, isValidTimeZone } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatMoney, parseAmount, sumAmounts } from "@/lib/money";
import { PERMISSIONS, ROLES, ROLE_KEYS, type Permission } from "@/lib/permissions";
import { safeAdminPath } from "@/lib/redirects";
import { normalizeSearch } from "@/lib/text";

describe("dinero", () => {
  it("convierte texto a Decimal sin errores de punto flotante", () => {
    expect(sumAmounts([parseAmount("0.10"), parseAmount("0.20")]).toString()).toBe("0.3");
    expect(parseAmount("1,250.50").toFixed(2)).toBe("1250.50");
  });
  it("rechaza montos inválidos", () => {
    for (const bad of ["0", "-5", "abc", "1.234", ""]) expect(() => parseAmount(bad)).toThrow();
  });
  it("formatea en MXN", () => {
    expect(formatMoney("1250.5")).toMatch(/\$1,250\.50/);
  });
});

describe("fechas", () => {
  // 2026-01-05 03:30 UTC es aún 4 de enero en Ciudad de México (UTC-6).
  const date = new Date("2026-01-05T03:30:00Z");
  it("usa dd/mm/aaaa en la zona horaria de la iglesia", () => {
    expect(formatDate(date, "America/Mexico_City")).toBe("04/01/2026");
    expect(formatDateTime(date, "America/Mexico_City")).toBe("04/01/2026 21:30");
  });
  it("valida zonas horarias", () => {
    expect(isValidTimeZone("America/Tijuana")).toBe(true);
    expect(isValidTimeZone("Marte/Base")).toBe(false);
  });
});

describe("texto", () => {
  it("normaliza acentos, mayúsculas y espacios", () => {
    expect(normalizeSearch("  José   PÉREZ Núñez ")).toBe("jose perez nunez");
  });
});

describe("redirecciones", () => {
  it("solo permite rutas del panel", () => {
    expect(safeAdminPath("/admin/usuarios")).toBe("/admin/usuarios");
    for (const bad of ["https://malicioso.test", "//malicioso.test", "/admin/../x", "/login", null]) {
      expect(safeAdminPath(bad)).toBe("/admin");
    }
  });
});

describe("matriz de permisos", () => {
  const roleHas = (role: (typeof ROLE_KEYS)[number], p: Permission) => ROLES[role].permissions.includes(p);

  it("solo usa permisos del catálogo", () => {
    for (const key of ROLE_KEYS) for (const p of ROLES[key].permissions) expect(PERMISSIONS).toHaveProperty(p);
  });
  it("el administrador no tiene acceso financiero automático", () => {
    const financial = Object.keys(PERMISSIONS).filter((p) => p.startsWith("finance:") || p === "reports:finance" || p === "audit:read_finance");
    for (const p of financial) expect(roleHas("ADMIN", p as Permission)).toBe(false);
  });
  it("solo el tesorero tiene finanzas", () => {
    for (const key of ROLE_KEYS) expect(roleHas(key, "finance:read")).toBe(key === "TREASURER");
  });
  it("solo el administrador asigna roles", () => {
    for (const key of ROLE_KEYS) expect(roleHas(key, "roles:assign")).toBe(key === "ADMIN");
  });
});

describe("autorización", () => {
  const actor: Actor = {
    userId: "u1",
    name: "A",
    email: "a@example.test",
    roles: ["SECRETARY"],
    permissions: new Set<Permission>(["members:read"]),
  };
  it("verifica permisos", () => {
    expect(can(actor, "members:read")).toBe(true);
    expect(can(actor, "finance:read")).toBe(false);
    expect(can(null, "members:read")).toBe(false);
  });
  it("lanza 401 sin actor y 403 sin permiso", () => {
    expect(() => requirePermission(null, "members:read")).toThrow(expect.objectContaining({ code: "UNAUTHENTICATED" }));
    try {
      requirePermission(actor, "finance:read");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("FORBIDDEN");
    }
  });
});
