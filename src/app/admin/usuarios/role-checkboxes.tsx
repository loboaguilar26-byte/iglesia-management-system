import { ROLES, ROLE_KEYS, type RoleKey } from "@/lib/permissions";

export function RoleCheckboxes({ selected = [], errors, disabled }: {
  selected?: RoleKey[];
  errors?: string[];
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled} aria-describedby={errors?.length ? "roles-error" : undefined}>
      <legend className="mb-1 text-sm font-medium">Roles</legend>
      {ROLE_KEYS.map((key) => (
        <label key={key} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm has-checked:border-primary">
          <input type="checkbox" name="roles" value={key} defaultChecked={selected.includes(key)} className="mt-0.5 size-4" />
          <span>
            <span className="font-medium">{ROLES[key].name}</span>
            <span className="block text-muted">{ROLES[key].description}</span>
          </span>
        </label>
      ))}
      {errors?.length ? <p id="roles-error" className="text-sm text-danger">{errors.join(" ")}</p> : null}
    </fieldset>
  );
}
