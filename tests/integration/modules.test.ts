import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/authz";
import { toDateInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { saveAttendance } from "@/modules/attendance/service";
import { getDashboard } from "@/modules/dashboard/service";
import {
  approveGivingReport,
  correctDonation,
  createDonation,
  createExpense,
  donationSummary,
  expenseSummary,
  listDonations,
  listGivingReports,
  myGivingReports,
  submitGivingReport,
  voidDonation,
  weeklyFinanceSummary,
} from "@/modules/finance/service";
import { createMember, getMember, listMembers, lookupMembers, setMemberStatus } from "@/modules/members/service";
import { addMembership, getMinistry, saveMinistry } from "@/modules/ministries/service";
import { buildReport } from "@/modules/reports/service";
import { createTestUser, resetDatabase } from "../support/db";

// Las funciones públicas usan la caché de Next ("use cache"); en pruebas se ejecutan directamente.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }));

const TZ = "America/Mexico_City";
// Fecha de hoy en la zona horaria de la iglesia (como la usa el sistema).
const today = toDateInput(new Date(), TZ);

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
    const outside = await createMember(secretary, { firstName: "Fuera", lastName: "Del Grupo" });
    const youth = await saveMinistry(admin, null, { name: "Jóvenes" });
    const other = await saveMinistry(admin, null, { name: "Niños" });
    await addMembership(admin, youth.id, { memberId: coordPerson.id, role: "COORDINATOR", startDate: today });
    await addMembership(admin, youth.id, { memberId: inside.id, role: "MEMBER", startDate: today });

    const coordinator = await createTestUser(["COORDINATOR"], "Coordinador");
    await db.user.update({ where: { id: coordinator.userId }, data: { memberId: coordPerson.id } });
    const actor = { ...coordinator, memberId: coordPerson.id };

    const names = (await listMembers(actor, {})).data.map((m) => m.firstName).sort();
    expect(names).toEqual(["Coord", "Dentro"]);
    expect(await lookupMembers(actor, "Fuera")).toEqual([]);
    expect(await lookupMembers(actor, "Fuera", { ministryId: youth.id })).toEqual([{ id: outside.id, name: "Fuera Del Grupo" }]);
    await expectCode(lookupMembers(actor, "Fuera", { ministryId: other.id }), "FORBIDDEN");
    await expect(getMinistry(actor, youth.id)).resolves.toBeTruthy();
    await expectCode(getMinistry(actor, other.id), "FORBIDDEN");
    // Puede agregar integrantes a su ministerio, pero no designar coordinadores.
    const extra = await createMember(secretary, { firstName: "Nuevo", lastName: "Integrante" });
    await expectCode(addMembership(actor, youth.id, { memberId: extra.id, role: "COORDINATOR", startDate: today }), "FORBIDDEN");
    await expect(addMembership(actor, youth.id, { memberId: extra.id, role: "MEMBER", startDate: today })).resolves.toBeUndefined();
    await expectCode(addMembership(actor, youth.id, { memberId: extra.id, role: "MEMBER", startDate: today }), "CONFLICT");

    const { id: typeId } = await db.eventType.findFirstOrThrow({ where: { name: "Culto" }, select: { id: true } });
    const startsAt = new Date(`${today}T10:00:00.000Z`);
    const endsAt = new Date(`${today}T11:00:00.000Z`);
    const [inScopeEvent, outOfScopeEvent] = await Promise.all([
      db.event.create({ data: { title: "Jóvenes", typeId, startsAt, endsAt, ministryId: youth.id } }),
      db.event.create({ data: { title: "Niños", typeId, startsAt, endsAt, ministryId: other.id } }),
    ]);
    await db.attendance.createMany({
      data: [
        { eventId: inScopeEvent.id, memberId: inside.id, status: "PRESENT" },
        { eventId: outOfScopeEvent.id, memberId: inside.id, status: "PRESENT" },
      ],
    });
    expect((await getMember(actor, inside.id)).attendance).toMatchObject([
      { event: { id: inScopeEvent.id, title: "Jóvenes" } },
    ]);
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

  it("impide que un coordinador registre miembros fuera del alcance del evento", async () => {
    await resetDatabase();
    const secretary = await createTestUser(["SECRETARY"]);
    const admin = await createTestUser(["ADMIN"]);
    const coordinatorUser = await createTestUser(["COORDINATOR"], "Coordinador");
    const coordinatorMember = await createMember(secretary, { firstName: "Coord", lastName: "Uno" });
    const inScope = await createMember(secretary, { firstName: "Dentro", lastName: "Grupo" });
    const outside = await createMember(secretary, { firstName: "Fuera", lastName: "Grupo" });
    const ministry = await saveMinistry(admin, null, { name: "Ministerio asignado" });
    await addMembership(admin, ministry.id, { memberId: coordinatorMember.id, role: "COORDINATOR", startDate: today });
    await addMembership(admin, ministry.id, { memberId: inScope.id, role: "MEMBER", startDate: today });
    await db.user.update({ where: { id: coordinatorUser.userId }, data: { memberId: coordinatorMember.id } });
    const coordinator = { ...coordinatorUser, memberId: coordinatorMember.id };
    const { typeId } = await catalogIds();
    const event = await db.event.create({
      data: {
        title: "Reunión del ministerio",
        typeId,
        ministryId: ministry.id,
        startsAt: new Date(Date.now() - 3600_000),
        endsAt: new Date(),
      },
    });

    await expectCode(saveAttendance(coordinator, event.id, { entries: [{ memberId: outside.id, status: "PRESENT" }] }), "FORBIDDEN");
    expect(await db.attendance.count({ where: { eventId: event.id } })).toBe(0);
    await expect(saveAttendance(coordinator, event.id, { entries: [{ memberId: inScope.id, status: "PRESENT" }] })).resolves.toMatchObject({ created: 1 });
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

  it("el administrador solo ve totales en el panel; tesorería completa sigue restringida", async () => {
    const ids = await catalogIds();
    await expectCode(createDonation(admin, { receivedAt: today, amount: "100", ...ids, anonymous: "on" }), "FORBIDDEN");
    await expectCode(listDonations(admin, { from: today, to: today }), "FORBIDDEN");
    const dashboard = await getDashboard(admin, TZ);
    expect(dashboard).not.toHaveProperty("finance");
    expect(dashboard.financeSummary).toMatchObject({ todayTotal: "0.00", todayCount: 0, weekTotal: "0.00", weekCount: 0 });
    await expectCode(buildReport(admin, "ingresos", { desde: today, hasta: today }), "FORBIDDEN");
  });

  it("muestra al administrador los ingresos aprobados del día y de la semana", async () => {
    const ids = await catalogIds();
    await createDonation(treasurer, { receivedAt: today, amount: "125.50", ...ids, anonymous: "on" });
    await createDonation(treasurer, { receivedAt: today, amount: "24.50", ...ids, anonymous: "on" });

    const dashboard = await getDashboard(admin, TZ);
    expect(dashboard.financeSummary).toMatchObject({ todayTotal: "150.00", todayCount: 2, weekTotal: "150.00", weekCount: 2 });
    expect(dashboard).not.toHaveProperty("finance");
    await expectCode(listDonations(admin, { from: today, to: today }), "FORBIDDEN");
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

  it("valida los reportes de ofrenda antes de sumarlos y protege el anonimato", async () => {
    const ids = await catalogIds();
    const member = await db.member.create({ data: { firstName: "Ana", lastName: "Anónima", searchName: "ana anonima" } });
    const memberUser = await createTestUser(["MEMBER"], "Ana Anónima");
    await db.user.update({ where: { id: memberUser.userId }, data: { memberId: member.id } });
    const memberActor = { ...memberUser, memberId: member.id };
    const report = await submitGivingReport(memberActor, { receivedAt: today, amount: "125.50", ...ids, anonymous: "on" });

    expect(await donationSummary(treasurer, { from: today, to: today })).toMatchObject({ total: "0.00", count: 0 });
    expect(await listGivingReports(treasurer)).toMatchObject([{ id: report.id, donorName: null, amount: "125.50" }]);
    await expectCode(approveGivingReport(admin, report.id), "FORBIDDEN");
    await approveGivingReport(treasurer, report.id);

    const [giving, donations] = await Promise.all([
      myGivingReports(memberActor),
      db.givingReport.findUniqueOrThrow({ where: { id: report.id }, select: { donationId: true } }),
    ]);
    expect(giving[0]).toMatchObject({ id: report.id, status: "APPROVED", isAnonymous: true });
    const donation = await db.donation.findUniqueOrThrow({ where: { id: donations.donationId! } });
    expect(donation.memberId).toBeNull();
    expect(donation.amount.toString()).toBe("125.5");
    expect((await donationSummary(treasurer, { from: today, to: today })).total).toBe("125.50");
    await expectCode(approveGivingReport(treasurer, report.id), "CONFLICT");
  });

  it("lleva gastos con anulación y calcula balance neto semanal", async () => {
    const ids = await catalogIds();
    await createDonation(treasurer, { receivedAt: today, amount: "150.00", ...ids, anonymous: "on" });
    const expense = await createExpense(treasurer, {
      spentAt: today,
      amount: "35.50",
      category: "Mantenimiento",
      description: "Reparación de una puerta",
      method: "Transferencia",
    });
    const weekly = await weeklyFinanceSummary(treasurer, { from: today, to: today });
    expect(weekly[0]).toMatchObject({ income: "150.00", expenses: "35.50", balance: "114.50", incomeCount: 1, expenseCount: 1 });
    expect((await expenseSummary(treasurer, { from: today, to: today })).total).toBe("35.50");
    await expect(db.expense.delete({ where: { id: expense.id } })).rejects.toThrow();
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

describe("seguimiento y reportes nuevos", () => {
  it("registra contactos, calcula pendientes y respeta permisos", async () => {
    await resetDatabase();
    const { addFollowUp, followUpBoard } = await import("@/modules/followups/service");
    const pastor = await createTestUser(["PASTOR"]);
    const secretary = await createTestUser(["SECRETARY"]);
    const treasurer = await createTestUser(["TREASURER"]);
    const visitor = await createMember(secretary, { firstName: "Visi", lastName: "Tante", status: "VISITOR" });

    let board = await followUpBoard(pastor, today);
    expect(board.uncontacted.map((m) => m.id)).toContain(visitor.id);

    const next = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
    await addFollowUp(secretary, visitor.id, { kind: "CALL", contactedOn: today, notes: "Bienvenida", nextAction: "Invitar a jóvenes", nextActionOn: next });
    board = await followUpBoard(pastor, today);
    expect(board.uncontacted.map((m) => m.id)).not.toContain(visitor.id);
    expect(board.pending.map((p) => p.memberId)).toContain(visitor.id);

    await expectCode(addFollowUp(treasurer, visitor.id, { kind: "CALL", contactedOn: today }), "FORBIDDEN");
    await expectCode(followUpBoard(treasurer, today), "FORBIDDEN");
    await expectCode(addFollowUp(secretary, visitor.id, { kind: "CALL", contactedOn: today, nextActionOn: "2000-01-01" }), "VALIDATION_ERROR");

    const report = await buildReport(pastor, "visitantes", { desde: "2020-01-01", hasta: today });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ contactos: 1 });
  });

  it("constancia de aportaciones: solo del donante, sin anuladas ni anónimas", async () => {
    await resetDatabase();
    const treasurer = await createTestUser(["TREASURER"]);
    const secretary = await createTestUser(["SECRETARY"]);
    const ids = await catalogIds();
    const donor = await createMember(secretary, { firstName: "Dona", lastName: "Dor" });
    const other = await createMember(secretary, { firstName: "Otra", lastName: "Persona" });
    await createDonation(treasurer, { receivedAt: today, amount: "100", ...ids, memberId: donor.id });
    const voided = await createDonation(treasurer, { receivedAt: today, amount: "999", ...ids, memberId: donor.id });
    await voidDonation(treasurer, voided.id, { reason: "Capturada por error" });
    await createDonation(treasurer, { receivedAt: today, amount: "50", ...ids, memberId: other.id });
    await createDonation(treasurer, { receivedAt: today, amount: "70", ...ids, anonymous: "on" });

    const r = await buildReport(treasurer, "constancia", { persona: donor.id, anio: Number(today.slice(0, 4)) });
    expect(r.rows).toHaveLength(1);
    expect(r.totals?.monto).toBe("$100.00");
    await expectCode(buildReport(secretary, "constancia", { persona: donor.id }), "FORBIDDEN");
  });

  it("asistencia por persona y cumpleaños", async () => {
    await resetDatabase();
    const secretary = await createTestUser(["SECRETARY"]);
    const { typeId } = await catalogIds();
    const m = await createMember(secretary, { firstName: "Asis", lastName: "Tente", birthDate: "1990-" + today.slice(5) });
    const ev = await db.event.create({ data: { title: "Culto", typeId, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date() } });
    await saveAttendance(secretary, ev.id, { entries: [{ memberId: m.id, status: "PRESENT" }] });
    const r = await buildReport(secretary, "asistencia-persona", { persona: m.id, desde: "2020-01-01", hasta: today });
    expect(r.rows).toHaveLength(1);
    expect(r.totals?.estado).toBe("100%");
    const b = await buildReport(secretary, "cumpleanos", { mes: Number(today.slice(5, 7)) });
    expect(b.rows.map((x) => x.nombre)).toContain("Asis Tente");
    // La visita no modifica el conteo de visitantes si no se envía.
    expect(await db.event.findUnique({ where: { id: ev.id } })).toMatchObject({ visitorCount: 0 });
  });
});

describe("capillas", () => {
  it("alta, baja, archivo con motivo, permisos y aislamiento de finanzas", async () => {
    await resetDatabase();
    const { saveChapel, setChapelStatus, getChapelOverview } = await import("@/modules/chapels/service");
    const admin = await createTestUser(["ADMIN"]);
    const secretary = await createTestUser(["SECRETARY"]);
    const treasurer = await createTestUser(["TREASURER"]);

    await expectCode(saveChapel(secretary, null, { name: "Capilla X", code: "CAP-X" }), "FORBIDDEN");
    await expectCode(saveChapel(admin, null, { name: "Capilla X", code: "cap x!" }), "VALIDATION_ERROR");
    const chapel = await saveChapel(admin, null, { name: "Capilla Norte", code: "cap-norte" });
    expect(chapel.code).toBe("CAP-NORTE");
    await expectCode(saveChapel(admin, null, { name: "Otra", code: "CAP-NORTE" }), "CONFLICT");

    const m = await createMember(secretary, { firstName: "Ana", lastName: "Capilla", chapelId: chapel.id });
    const ids = await catalogIds();
    await createDonation(treasurer, { receivedAt: today, amount: "250", ...ids, anonymous: "on", chapelId: chapel.id });

    // El secretario ve el resumen pero no las finanzas; el tesorero sí.
    const forSecretary = await getChapelOverview(secretary, chapel.id);
    expect(forSecretary.members.ACTIVE).toBe(1);
    expect(forSecretary.finance).toBeUndefined();
    const forTreasurer = await getChapelOverview(treasurer, chapel.id);
    expect(forTreasurer.finance?.monthTotal).toBe("250.00");

    // Archivar requiere motivo; ya no recibe registros nuevos pero conserva los existentes.
    await expectCode(setChapelStatus(admin, chapel.id, { status: "ARCHIVED" }), "VALIDATION_ERROR");
    await setChapelStatus(admin, chapel.id, { status: "ARCHIVED", reason: "Se fusionó con otra sede" });
    await expectCode(createMember(secretary, { firstName: "Nuevo", lastName: "Registro", chapelId: chapel.id }), "VALIDATION_ERROR");
    await expect(updateMemberKeep(secretary, m.id, chapel.id)).resolves.toBeTruthy();
    expect(await db.auditLog.count({ where: { entityType: "Chapel", entityId: chapel.id, action: "chapel.archive" } })).toBe(1);
    await setChapelStatus(admin, chapel.id, { status: "ACTIVE" });
    expect(await db.chapel.findUnique({ where: { id: chapel.id } })).toMatchObject({ status: "ACTIVE", archivedAt: null });
  });
});

/** Editar a una persona conservando su capilla actual (aunque esté archivada). */
async function updateMemberKeep(actor: Actor, id: string, chapelId: string) {
  const { updateMember } = await import("@/modules/members/service");
  return updateMember(actor, id, { firstName: "Ana", lastName: "Capilla", chapelId, confirmDuplicate: "on" });
}

describe("iglesias y franquicias (módulo de Victor)", () => {
  it("crea franquicia e iglesia con perfil, respeta permisos y evita duplicados", async () => {
    await resetDatabase();
    const { createChurch, listChurches, listFranchises } = await import("@/modules/churches/service");
    const admin = await createTestUser(["ADMIN"]);
    const secretary = await createTestUser(["SECRETARY"]);

    await expectCode(createChurch(secretary, { franchiseName: "Red Uno", name: "Iglesia A", slug: "iglesia-a" }), "FORBIDDEN");
    const church = await createChurch(admin, { franchiseName: "Red Uno", name: "Iglesia A", slug: "iglesia-a" });
    expect(church.franchise.slug).toBe("red-uno");
    expect(church.profile?.currency).toBe("MXN");
    await expectCode(createChurch(admin, { franchiseId: church.franchise.id, name: "Otra", slug: "iglesia-a" }), "CONFLICT");
    await expectCode(createChurch(admin, { franchiseName: "Red Uno", name: "Iglesia B", slug: "iglesia-b" }), "CONFLICT");
    expect((await listFranchises(admin))[0]._count.churches).toBe(1);
    expect(await listChurches(admin)).toHaveLength(1);
    expect(await db.auditLog.count({ where: { action: "church.create" } })).toBe(1);
  });

  it("panorama, equipo por sede con jerarquía y desactivación con motivo", async () => {
    await resetDatabase();
    const svc = await import("@/modules/churches/service");
    const admin = await createTestUser(["ADMIN"]);
    const pastor = await createTestUser(["PASTOR"]);
    const secretary = await createTestUser(["SECRETARY"]);
    const church = await svc.createChurch(admin, { franchiseName: "Red Dos", name: "Iglesia Norte", slug: "iglesia-norte" });

    let o = await svc.getNetworkOverview(pastor);
    expect(o.totals).toMatchObject({ franchises: 1, active: 1, team: 0 });
    expect(o.insights[0]).toMatchObject({ tone: "danger", churchId: church.id });

    const roles = Object.fromEntries((await db.role.findMany()).map((r) => [r.key, r.id]));
    await expectCode(svc.addChurchTeamMember(pastor, church.id, { userId: secretary.userId }), "FORBIDDEN");
    await expectCode(svc.addChurchTeamMember(admin, church.id, { userId: admin.userId, roleId: roles.ADMIN }), "FORBIDDEN");
    await svc.addChurchTeamMember(admin, church.id, { userId: pastor.userId, roleId: roles.PASTOR, isPrimary: true });

    const d = await svc.getChurchDetail(admin, church.id);
    expect(d.team).toHaveLength(1);
    expect(d.team[0]).toMatchObject({ id: pastor.userId, isPrimary: true });
    expect(d.team[0]!.roles.map((r) => r.key)).toEqual(["PASTOR"]);
    expect(d.readiness.checks.find((k) => k.key === "team")?.done).toBe(true);
    o = await svc.getNetworkOverview(admin);
    expect(o.insights.some((i) => i.tone === "danger")).toBe(false);

    await expectCode(svc.setChurchStatus(admin, church.id, { isActive: false }), "VALIDATION_ERROR");
    await svc.setChurchStatus(admin, church.id, { isActive: false, reason: "Fusión con otra sede" });
    await expectCode(svc.addChurchTeamMember(admin, church.id, { userId: secretary.userId }), "CONFLICT");
    expect((await svc.getNetworkOverview(admin)).totals).toMatchObject({ active: 0, inactive: 1 });

    await svc.removeChurchTeamMember(admin, church.id, pastor.userId);
    expect(await db.churchRoleAssignment.count({ where: { churchId: church.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { entityType: "Church", entityId: church.id } })).toBe(4);
  });
});

describe("portal del miembro: participación", () => {
  it("agenda con RSVP, solicitudes de ministerio, oración, aportaciones y mis datos", async () => {
    await resetDatabase();
    const p = await import("@/modules/portal/engagement");
    const secretary = await createTestUser(["SECRETARY"]);
    const admin = await createTestUser(["ADMIN"]);
    const pastor = await createTestUser(["PASTOR"]);
    const memberUser = await createTestUser(["MEMBER"], "Ana Portal");
    const other = await createTestUser(["MEMBER"], "Otra Persona");
    const ana = await createMember(secretary, { firstName: "Ana", lastName: "Portal" });
    const beto = await createMember(secretary, { firstName: "Beto", lastName: "Otro" });
    await db.user.update({ where: { id: memberUser.userId }, data: { memberId: ana.id } });
    await db.user.update({ where: { id: other.userId }, data: { memberId: beto.id } });
    const me = { ...memberUser, memberId: ana.id };
    const them = { ...other, memberId: beto.id };
    const { typeId, conceptId, methodId } = await catalogIds();

    // Agenda: solo eventos públicos o de mis ministerios; RSVP idempotente.
    const soon = new Date(Date.now() + 86400_000);
    const publicEvent = await db.event.create({ data: { title: "Culto", typeId, visibility: "PUBLIC", startsAt: soon, endsAt: new Date(soon.getTime() + 3600_000) } });
    const privateEvent = await db.event.create({ data: { title: "Junta", typeId, startsAt: soon, endsAt: new Date(soon.getTime() + 3600_000) } });
    expect((await p.myAgenda(me)).map((e) => e.id)).toEqual([publicEvent.id]);
    await expectCode(p.setMyRsvp(me, privateEvent.id, { response: "GOING" }), "NOT_FOUND");
    await p.setMyRsvp(me, publicEvent.id, { response: "MAYBE" });
    await p.setMyRsvp(me, publicEvent.id, { response: "GOING" });
    expect((await p.myAgenda(me))[0]).toMatchObject({ myResponse: "GOING", going: 1 });
    expect(await p.eventRsvpSummary(secretary, publicEvent.id)).toMatchObject({ going: 1, maybe: 0 });
    expect((await p.myEventIcs(me, publicEvent.id)).body).toContain("BEGIN:VEVENT");
    await expectCode(p.myEventIcs(me, privateEvent.id), "NOT_FOUND");

    // Ministerios: solicitar, no duplicar, aprobar crea la participación.
    const ministry = await saveMinistry(admin, null, { name: "Alabanza" });
    await p.requestToJoinMinistry(me, ministry.id, { message: "Toco guitarra" });
    await expectCode(p.requestToJoinMinistry(me, ministry.id, {}), "CONFLICT");
    const [req] = await p.pendingJoinRequests(admin, ministry.id);
    await expectCode(p.reviewJoinRequest(them, req!.id, { decision: "APPROVED" }), "FORBIDDEN");
    await p.reviewJoinRequest(admin, req!.id, { decision: "APPROVED" });
    expect(await db.ministryMembership.count({ where: { ministryId: ministry.id, memberId: ana.id, endDate: null } })).toBe(1);
    await expectCode(p.reviewJoinRequest(admin, req!.id, { decision: "REJECTED" }), "CONFLICT");
    expect((await p.myMinistriesOverview(me)).mine).toHaveLength(1);

    // Oración: privada por persona; solo el equipo pastoral la lee y responde.
    await p.createPrayerRequest(me, { subject: "Salud", body: "Por la salud de mi familia, gracias." });
    expect(await p.myPrayerRequests(them)).toHaveLength(0);
    await expectCode(p.listPrayerRequests(admin), "FORBIDDEN");
    const [prayer] = (await p.listPrayerRequests(pastor)).rows;
    await p.updatePrayerRequest(pastor, prayer!.id, { status: "PRAYING", pastoralNote: "Estamos orando." });
    await expectCode(p.closeMyPrayerRequest(them, prayer!.id, true), "NOT_FOUND");
    await p.closeMyPrayerRequest(me, prayer!.id, true);
    expect((await p.myPrayerRequests(me))[0]).toMatchObject({ status: "ANSWERED", pastoralNote: "Estamos orando." });
    const audit = await db.auditLog.findFirst({ where: { action: "prayer.create" } });
    expect(JSON.stringify(audit?.metadata)).not.toContain("salud");

    // Aportaciones y constancia: solo las propias con nombre.
    await db.donation.createMany({
      data: [
        { amount: "100.00", receivedAt: new Date(), conceptId, methodId, memberId: ana.id, createdById: admin.userId },
        { amount: "50.00", receivedAt: new Date(), conceptId, methodId, memberId: beto.id, createdById: admin.userId },
      ],
    });
    const giving = await p.myGiving(me);
    expect(giving).toMatchObject({ total: "100.00", count: 1 });
    const statement = await p.myGivingStatement(me);
    expect(statement.rows).toHaveLength(1);

    // Mis datos: incluye lo propio y queda en bitácora.
    const data = await p.myDataExport(me);
    expect(data.firstName).toBe("Ana");
    expect(data.rsvps).toHaveLength(1);
    expect(data.donations).toHaveLength(1);
    expect(await db.auditLog.count({ where: { action: { in: ["portal.data_export", "portal.statement_export"] } } })).toBe(2);

    // Sin ficha vinculada no hay portal.
    await expectCode(p.myAgenda(admin), "FORBIDDEN");
  });
});

describe("confesiones", () => {
  it("reserva sin choques, mensaje anónimo cifrado y solo el sacerdote lo lee", async () => {
    await resetDatabase();
    vi.stubEnv("CONFESSIONS_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
    const c = await import("@/modules/confessions/service");
    const priest = await createTestUser(["PRIEST"], "Padre Prueba");
    const admin = await createTestUser(["ADMIN"]);
    const pastor = await createTestUser(["PASTOR"]);

    // Cita en la iglesia principal, a una hora redonda de pasado mañana (hora de la iglesia).
    const day = toDateInput(new Date(Date.now() + 2 * 86400_000), TZ);
    const slot = { chapelId: "main", scheduledAt: `${day}T10:00`, contactName: "Ana", contactPhone: "5512345678" };
    await c.requestConfessionAppointment(slot);
    await expectCode(c.requestConfessionAppointment(slot), "CONFLICT");
    await expectCode(c.requestConfessionAppointment({ ...slot, scheduledAt: `${day}T10:15` }), "VALIDATION_ERROR");
    await c.requestConfessionAppointment({ ...slot, website: "bot" }); // trampa: se ignora en silencio
    expect(await db.confessionAppointment.count()).toBe(1);
    const stored = await db.confessionAppointment.findFirstOrThrow();
    expect(stored.contactCiphertext).not.toContain("Ana");

    await c.submitAnonymousConfessionMessage({ body: "Necesito hablar con alguien, gracias." });
    const raw = await db.confessionMessage.findFirstOrThrow();
    expect(raw.bodyCiphertext).not.toContain("Necesito");
    expect(Object.keys(raw)).not.toContain("memberId");

    await expectCode(c.listConfessions(admin), "FORBIDDEN");
    await expectCode(c.listConfessions(pastor), "FORBIDDEN");
    const list = await c.listConfessions(priest);
    expect(list.appointments[0]?.contact).toMatchObject({ name: "Ana", phone: "5512345678" });
    expect(list.messages[0]?.body).toBe("Necesito hablar con alguien, gracias.");

    await c.updateConfessionAppointment(priest, stored.id, { status: "CANCELLED" });
    await c.requestConfessionAppointment(slot); // el horario cancelado queda libre
    await expectCode(c.updateAnonymousConfessionMessage(priest, raw.id, { status: "RESPONDED" }), "VALIDATION_ERROR");
    await c.updateAnonymousConfessionMessage(priest, raw.id, { status: "RESPONDED", response: "Te esperamos." });
    expect((await c.listConfessions(priest)).messages[0]?.priestResponse).toBe("Te esperamos.");
    vi.unstubAllEnvs();
  });
});

describe("capillas como franquicia", () => {
  it("cada capilla tiene identidad propia y solo las activas y públicas aparecen en el sitio", async () => {
    await resetDatabase();
    const chapels = await import("@/modules/chapels/service");
    const pub = await import("@/modules/public/service");
    const admin = await createTestUser(["ADMIN"]);
    const secretary = await createTestUser(["SECRETARY"]);
    const norte = await chapels.saveChapel(admin, null, { name: "Capilla Norte", code: "NORTE" });
    const sur = await chapels.saveChapel(admin, null, { name: "Capilla Sur", code: "SUR" });

    await expectCode(chapels.saveChapelIdentity(secretary, norte.id, { primaryColor: "#123456", accentColor: "#abcdef" }), "FORBIDDEN");
    await expectCode(chapels.saveChapelIdentity(admin, norte.id, { primaryColor: "rojo", accentColor: "#abcdef" }), "VALIDATION_ERROR");
    await expectCode(chapels.saveChapelIdentity(admin, norte.id, { primaryColor: "#123456", accentColor: "#abcdef", mapUrl: "javascript:alert(1)" }), "VALIDATION_ERROR");
    await chapels.saveChapelIdentity(admin, norte.id, {
      isPublic: "on",
      primaryColor: "#123456",
      accentColor: "#ABCDEF",
      tagline: "Fe en el barrio",
      scheduleText: "Domingo 10:00",
      mapUrl: "https://maps.example.test/norte",
    });
    await chapels.saveChapelIdentity(admin, sur.id, { primaryColor: "#654321", accentColor: "#fedcba" }); // isPublic sin marcar: oculta

    const listed = await pub.getPublicChapels();
    expect(listed.map((c) => c.code)).toEqual(["NORTE"]);
    const page = await pub.getPublicChapel("norte");
    expect(page?.chapel).toMatchObject({ name: "Capilla Norte", primaryColor: "#123456", tagline: "Fe en el barrio" });
    expect(page?.chapel).not.toHaveProperty("managerMemberId");
    expect(await pub.getPublicChapel("sur")).toBeNull();

    await chapels.setChapelStatus(admin, norte.id, { status: "INACTIVE" });
    expect(await pub.getPublicChapel("norte")).toBeNull();
    expect(await db.auditLog.count({ where: { action: "chapel.identity_update" } })).toBe(2);
  });
});
