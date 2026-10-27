// Entrada suave en cada página del sitio público.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
