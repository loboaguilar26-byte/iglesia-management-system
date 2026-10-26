import { ImageResponse } from "next/og";
import { getPublicSite } from "@/modules/public/service";

const SIZES = new Set([192, 512]);

/**
 * Ícono de la app instalable (Android/PC). Inicial del nombre de la iglesia sobre azul de marca.
 * `?maskable=1` deja margen de seguridad para íconos adaptativos de Android.
 */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Tamaño no soportado", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const { settings } = await getPublicSite();
  const letter = settings.name.trim().charAt(0).toUpperCase() || "I";
  const pad = maskable ? size * 0.2 : size * 0.08;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: maskable ? "#0f1f36" : "transparent" }}>
        <div
          style={{
            margin: pad,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: maskable ? 0 : size * 0.22,
            background: "linear-gradient(135deg, #1a3253 0%, #0f1f36 100%)",
            color: "#e2b65e",
            fontSize: (size - pad * 2) * 0.55,
            fontWeight: 700,
          }}
        >
          {letter}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
