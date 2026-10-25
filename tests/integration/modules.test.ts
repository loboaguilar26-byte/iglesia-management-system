import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { saveAttendance } from "@/modules/attendance/service";
import { getDashboard } from "@/modules/dashboard/service";
import { correctDonation, createDonation, donationSummary, listDonations, voidDonation } from "@/modules/finance/service";
import { createMember, listMembers, lookupMembers, setMemberStatus } from "@/modules/members/service";
import { addMembership, getMinistry, saveMinistry } from "@/modules/ministries/service";
import { buildReport } from "@/modules/reports/service";
import { createTestUser, resetDatabase } from "../support/db";

// Las funciones públicas usan la caché de Next ("use cache"); en pruebas se ejecutan directamente.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));

const TZ = "America/Mexico_City";
const today = new Date().toISOString().slice(0, 10);

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

async function catalogIds() {
  const [concept, method, type] = await Promise.all([
    db.donationConcept.findFirstOrThrow({ where: { name: "Diezmo" } }),
    db.paymentMethod.findFirstOrThrow({ where: { name: "Efectivo" } }),
    db.eventType.findFirstOrThrow({ where: { name: "Culto" } }),
  ]);
  return { conceptId: concept.id, methodId: method.id, typeId: type.id };
}

describe("miembros", () => {
  let secretary: Actor;
  beforeEach(async () => {
    await resetDatabase();
    secretary = await createTestUser(["SECRETARY"]);
  });

  it("crea, busca sin acentos y desactiva sin borrar", async () => {
    const m = await createMember(secretary, { firstName: "José", lastName: "Núñez", status: "ACTIVE" });
    expect((await listMembers(secretary, { q: "jose nunez" })).meta.total).toBe(1);
    expect((await listMembers(secretary, { status: "INACTIVE" })).meta.total).toBe(0);
    await setMemberStatus(secretary, m.id, "INACTIVE");
    expect(await db.member.findUnique({ where: { id: m.id } })).toMatchObject({ status: "INACTIVE" });
    expect((await listMembers(secretary, { status: "INACTIVE" })).meta.total).toBe(1);
  });

  it("permite personas sin correo y detecta duplicados evidentes", async () => {
    await createMember(secretary, { firstName: "Ana", lastName: "Ruiz", phone: "5512345678" });
    await expectCode(createMember(secretary, { firstName: "ana", lastName: "ruíz", phone: "5512345678" }), "CONFLICT");
    await expect(createMember(secretary, { firstName: "Ana", lastName: "Ruiz", phone: "5512345678", confirmDuplicate: "on" })).resolves.toBeTruthy();
    await createMember(secretary, { firstName: "Luis", lastName: "Paz", email: "luis@example.test" });
    await expectCode(createMember(secretary, { firstName: "Otro", lastName: "Nombre", email: "LUIS@example.test" }), "CONFLICT");
  });

  it("valida datos y restringe por rol", async () => {
    await expectCode(createMember(secretary, { firstName: "", lastName: "X", email: "no-es-correo" }), "VALIDATION_ERROR");
    const treasurer = await createTestUser(["TREASURER"]);
    await expectCode(listMembers(treasurer, {}), "FORBIDDEN");
    // El tesorero sí puede buscar donantes, pero solo recibe id y nombre.
    await createMember(secretary, { firstName: "Eva", lastName: "Sol", phone: "5500000001", email: "eva@example.test" });
    const found = await lookupMembers(treasurer, "eva");
    expect(found).toEqual([{ id: expect.any(String), name: "Eva Sol" }]);
  });

  it("el coordinador solo ve integrantes de los ministerios que coordina", async () => {
    const admin = await createTestUser(["ADMIN"]);
    const coordPerson = await createMember(secretary, { firstName: "Coord", lastName: "Uno" });
    const inside = await createMember(secretary, { firstName: "Dentro", lastName: "Del Grupo" });
    await createMember(secretary, { firstName: "Fuera", lastName: "Del Grupo" });
    const youth = await saveMinistry(admin, null, { name: "Jóvenes" });
    const other = await saveMinistry(admin, null, { name: "Niños" });
    await addMembership(admin, youth.id, { memberId: coordPerson.id, role: "COORDINATOR", startDate: today });
    await addMembership(admin, youth.id, { memberId: inside.id, role: "MEMBER", startDate: today });

    const coordinator = await createTestUser(["COORDINATOR"], "Coordinador");
    await db.user.update({ where: { id: coordinator.userId }, data: { memberId: coordPerson.id } });
    const actor = { ...coordinator, memberId: coordPerson.id };

    const names = (await listMembers(actor, {})).data.map((m) => m.firstName).sort();
    expect(names).toEqual(["Coord", "Dentro"]);
    await expect(getMinistry(actor, youth.id)).resolves.toBeTruthy();
    await expectCode(getMinistry(actor, other.id), "FORBIDDEN");
    // Puede agregar integrantes a su ministerio, pero no designar coordinadores.
    const extra = await createMember(secretary, { firstName: "Nuevo", lastName: "Integrante" });
    await expectCode(addMembership(actor, youth.id, { memberId: extra.id, role: "COORDINATOR", startDate: today }), "FORBIDDEN");
    await expect(addMembership(actor, youth.id, { memberId: extra.id, role: "MEMBER", startDate: today })).resolves.toBeUndefined();
    await expectCode(addMembership(actor, youth.id, { memberId: extra.id, role: "MEMBER", startDate: today }), "CONFLICT");
  });
});

describe("asistencia", () => {
  it("registra sin duplicados, distingue pendientes y audita correcciones", async () => {
    await resetDatabase();
    const secretary = await createTestUser(["SECRETARY"]);
    const coordinatorNoUpdate = await createTestUser(["SECRETARY"]);
    const { typeId } = await catalogIds();
    const [a, b, c] = await Promise.all(["A", "B", "C"].map((n) => createMember(secretary, { firstName: n, lastName: "Prueba" })));
    const event = await db.event.create({ data: { title: "Culto", typeId, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date() } });

    await saveAttendance(secretary, event.id, { visitorCount: 4, entries: [{ memberId: a.id, status: "PRESENT" }, { memberId: b.id, status: "ABSENT" }, { memberId: c.id, status: "" }] });
    // Repetir el guardado no duplica registros.
    await saveAttendance(secretary, event.id, { visitorCount: 4, entries: [{ memberId: a.id, status: "PRESENT" }] });
    expect(await db.attendance.count({ where: { eventId: event.id } })).toBe(2);
    expect(await db.attendance.count({ where: { eventId: event.id, memberId: c.id } })).toBe(0); // pendiente, no ausente
    expect(await db.event.findUnique({ where: { id: event.id } })).toMatchObject({ visitorCount: 4 });

    // Corregir una marca existente requiere attendance:update.
    const limited = { ...coordinatorNoUpdate, permissions: new Set([...coordinatorNoUpdate.permissions].filter((p) => p !== "attendance:update")) };
    await expectCode(saveAttendance(limited, event.id, { visitorCount: 4, entries: [{ memberId: b.id, status: "PRESENT" }] }), "FORBIDDEN");

    await saveAttendance(secretary, event.id, { visitorCount: 4, entries: [{ memberId: b.id, status: "PRESENT" }] });
    expect(await db.auditLog.count({ where: { action: "attendance.correct", entityId: event.id } })).toBe(1);

    const future = await db.event.create({ data: { title: "Futuro", typeId, startsAt: new Date(Date.now() + 5 * 86400_000), endsAt: new Date(Date.now() + 5 * 86400_000 + 3600_000) } });
    await expectCode(saveAttendance(secretary, future.id, { visitorCount: 0, entries: [{ memberId: a.id, status: "PRESENT" }] }), "CONFLICT");
  });
});

describe("tesorería", () => {
  let treasurer: Actor;
  let admin: Actor;
  beforeEach(async () => {
    await resetDatabase();
    treasurer = await createTestUser(["TREASURER"]);
    admin = await createTestUser(["ADMIN"]);
  });

  it("solo el tesorero accede; el administrador no tiene acceso automático", async () => {
    const ids = await catalogIds();
    await expectCode(createDonation(admin, { receivedAt: today, amount: "100", ...ids, anonymous: "on" }), "FORBIDDEN");
    await expectCode(listDonations(admin, { from: today, to: today }), "FORBIDDEN");
    const dashboard = await getDashboard(admin, TZ);
    expect(dashboard).not.toHaveProperty("finance");
    await expectCode(buildReport(admin, "ingresos", { desde: today, hasta: today }), "FORBIDDEN");
  });

  it("suma con precisión decimal, registra anónimas y corrige con trazabilidad", async () => {
    const ids = await catalogIds();
    await createDonation(treasurer, { receivedAt: today, amount: "0.10", ...ids, anonymous: "on" });
    await createDonation(treasurer, { receivedAt: today, amount: "0.20", ...ids, anonymous: "on" });
    const wrong = await createDonation(treasurer, { receivedAt: today, amount: "1,000.00", ...ids, anonymous: "on" });
    expect(wrong.memberId).toBeNull();
    expect((await donationSummary(treasurer, { from: today, to: today })).total).toBe("1000.30");

    const fixed = await correctDonation(treasurer, wrong.id, { receivedAt: today, amount: "100.00", ...ids, anonymous: "on", reason: "Se capturó un cero de más" });
    expect(fixed.correctsId).toBe(wrong.id);
    expect(await db.donation.findUnique({ where: { id: wrong.id } })).toMatchObject({ status: "VOIDED" });
    expect((await donationSummary(treasurer, { from: today, to: today })).total).toBe("100.30");
    expect(await db.auditLog.count({ where: { action: "donation.correct" } })).toBe(1);

    await expectCode(voidDonation(treasurer, wrong.id, { reason: "otra vez" }), "CONFLICT");
    await expectCode(createDonation(treasurer, { receivedAt: today, amount: "12.345", ...ids, anonymous: "on" }), "VALIDATION_ERROR");
    await expectCode(createDonation(treasurer, { receivedAt: today, amount: "50", ...ids }), "VALIDATION_ERROR"); // sin donante ni anónima
    // La base de datos impide borrar aportaciones.
    await expect(db.donation.delete({ where: { id: fixed.id } })).rejects.toThrow();
  });

  it("el reporte de ingresos coincide con el resumen del panel", async () => {
    const ids = await catalogIds();
    for (const amount of ["150.50", "49.50", "300"]) await createDonation(treasurer, { receivedAt: today, amount, ...ids, anonymous: "on" });
    const report = await buildReport(treasurer, "ingresos", { desde: today, hasta: today });
    const dashboard = await getDashboard(treasurer, TZ);
    expect(report.totals?.total).toBe("$500.00");
    expect(dashboard.finance?.monthTotal).toBe("500.00");
  });
});

describe("sitio público", () => {
  it("solo expone eventos y comunicados públicos, sin datos personales", async () => {
    await resetDatabase();
    const admin = await createTestUser(["ADMIN"]);
    const { typeId } = await catalogIds();
    const soon = new Date(Date.now() + 86400_000);
    const later = new Date(Date.now() + 90000_000);
    await db.event.create({ data: { title: "Evento público", typeId, startsAt: soon, endsAt: later, visibility: "PUBLIC" } });
    await db.event.create({ data: { title: "Reunión interna", typeId, startsAt: soon, endsAt: later, visibility: "PRIVATE" } });
    await db.announcement.create({ data: { title: "Aviso público", body: "x", authorId: admin.userId, visibility: "PUBLIC", status: "PUBLISHED", publishedAt: new Date() } });
    await db.announcement.create({ data: { title: "Aviso interno", body: "x", authorId: admin.userId, visibility: "PRIVATE", status: "PUBLISHED", publishedAt: new Date() } });
    await db.announcement.create({ data: { title: "Borrador", body: "x", authorId: admin.userId, visibility: "PUBLIC", status: "DRAFT" } });
    await db.member.create({ data: { firstName: "Privado", lastName: "Persona", searchName: "privado persona", email: "privado@example.test", phone: "5599999999" } });

    const pub = await import("@/modules/public/service");
    const [site, events, announcements] = await Promise.all([pub.getPublicSite(), pub.getPublicEvents(), pub.getPublicAnnouncements()]);
    expect(events.map((e) => e.title)).toEqual(["Evento público"]);
    expect(announcements.map((a) => a.title)).toEqual(["Aviso público"]);
    const serialized = JSON.stringify({ site, events, announcements });
    expect(serialized).not.toContain("privado@example.test");
    expect(serialized).not.toContain("5599999999");
    expect(Object.keys(events[0]).sort()).toEqual(["description", "endsAt", "id", "location", "startsAt", "status", "title", "type"]);
  });
});
