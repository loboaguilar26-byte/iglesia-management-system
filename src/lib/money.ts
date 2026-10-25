import { Decimal } from "decimal.js";

/** Convierte texto capturado ("1,250.50") a Decimal con 2 decimales. Rechaza más de 2 decimales. */
export function parseAmount(input: string): Decimal {
  const clean = input.replace(/[\s,$]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new Error("Monto inválido");
  const value = new Decimal(clean);
  if (value.lte(0)) throw new Error("El monto debe ser mayor que cero");
  if (value.gte("10000000000")) throw new Error("Monto fuera de rango");
  return value;
}

export function sumAmounts(values: Array<Decimal.Value>): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
}

export function formatMoney(value: Decimal.Value, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    new Decimal(value).toNumber(),
  );
}
