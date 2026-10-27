// `template` se vuelve a montar en cada navegación: da una entrada suave a cada pantalla del panel.
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
