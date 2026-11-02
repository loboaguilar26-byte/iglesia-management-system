import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const SIZES = new Set([192, 512, 1024]);

/**
 * Ícono de la app instalable (Android/PC) con el emblema real de Eclaria.
 * `?maskable=1` deja margen de seguridad para íconos adaptativos de Android.
 */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Tamaño no soportado", { status: 404 });
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const emblem = await readFile(path.join(process.cwd(), "public", "branding", "eclaria-logo.jpg"));
  const src = `data:image/jpeg;base64,${emblem.toString("base64")}`;
  const inner = maskable ? size * 0.78 : size;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: maskable ? "#070b14" : "transparent" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={inner} height={inner} alt="" style={{ borderRadius: "50%" }} />
      </div>
    ),
    { width: size, height: size },
  );
}
