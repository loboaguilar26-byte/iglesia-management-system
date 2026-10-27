import { ImageResponse } from "next/og";

const SIZES = new Set([192, 512]);

/**
 * Ícono de la app instalable (Android/PC) con la marca IgleTech.
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
          <div style={{ width: size * 0.32, height: size * 0.3, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: 0, width: size * 0.045, height: size * 0.3, borderRadius: size * 0.03, background: "#f0cd7b" }} />
            <div style={{ position: "absolute", top: size * 0.07, width: size * 0.2, height: size * 0.045, borderRadius: size * 0.03, background: "#f0cd7b" }} />
          </div>
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
