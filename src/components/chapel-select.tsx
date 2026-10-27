import { SelectField } from "@/components/ui/field";
import { db } from "@/lib/db";
import { chapelOptions } from "@/modules/chapels/service";

/**
 * Selector de capilla para formularios del servidor. Lista las capillas activas y conserva la
 * capilla actual del registro aunque ya no esté activa. No se muestra si no hay capillas.
 */
export async function ChapelSelect({ defaultValue, hint }: { defaultValue?: string | null; hint?: string }) {
  const options = await chapelOptions();
  if (defaultValue && !options.some((o) => o.id === defaultValue)) {
    const current = await db.chapel.findUnique({ where: { id: defaultValue }, select: { id: true, name: true, code: true } });
    if (current) options.push({ ...current, name: `${current.name} (no activa)` });
  }
  if (options.length === 0) return null;
  return (
    <SelectField
      label="Capilla"
      name="chapelId"
      defaultValue={defaultValue ?? ""}
      placeholder="Sede principal"
      options={options.map((o) => ({ value: o.id, label: `${o.name} · ${o.code}` }))}
      hint={hint}
    />
  );
}
