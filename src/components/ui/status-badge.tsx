export function StatusBadge({ active, activeLabel = "Activo", inactiveLabel = "Inactivo" }: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
