import { ImageResponse } from "next/og";

// 1024: imagen base para generar los íconos y la pantalla de inicio de la app móvil.
const SIZES = new Set([192, 512, 1024]);

/**
 * Ícono de la app instalable (Android/PC) con la marca Eclaria.
 * `?maskable=1` deja margen de seguridad para íconos adaptativos de Android.
 */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Tamaño no soportado", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const pad = maskable ? size * 0.2 : size * 0.08;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: maskable ? "#2a170c" : "transparent" }}>
        <div
          style={{
            margin: pad,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: size * 0.035,
            borderRadius: maskable ? 0 : size * 0.22,
            background: "linear-gradient(135deg, #6b3f24 0%, #2a170c 100%)",
          }}
        >
          <svg width={size * 0.42} height={size * 0.28} viewBox="0 0 120 80" fill="none">
            <path d="M8 45c16-2 26-11 34-28 3 12 9 19 18 23 8-13 22-21 43-21-9 7-14 15-15 24 10-1 20 1 29 7-18 1-29 8-36 19-9-9-18-13-29-12-15 2-29-1-44-12Z" fill="#f0cd7b" />
          </svg>
          <div style={{ width: size * 0.62, height: size * 0.27, display: "flex", gap: size * 0.015 }}>
            {[0, 1].map((page) => (
              <div key={page} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: size * 0.025, padding: size * 0.035, border: `${size * 0.018}px solid #e2b65e`, borderRadius: page === 0 ? `${size * 0.1}px ${size * 0.025}px ${size * 0.03}px ${size * 0.06}px` : `${size * 0.025}px ${size * 0.1}px ${size * 0.06}px ${size * 0.03}px`, background: "#fff9ec" }}>
                <div style={{ width: "80%", height: size * 0.012, borderRadius: size * 0.01, background: "#a88a58" }} />
                <div style={{ width: "68%", height: size * 0.012, borderRadius: size * 0.01, background: "#a88a58" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
