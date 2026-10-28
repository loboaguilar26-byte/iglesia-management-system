import { connection } from "next/server";
import { db } from "@/lib/db";
import { readStored } from "@/lib/storage";

// Portada de una capilla. Solo se sirve si la capilla está activa y es pública.
export async function GET(_request: Request, { params }: RouteContext<"/media/capilla/[code]">) {
  await connection();
  const { code } = await params;
  const chapel = /^[a-z0-9-]{2,12}$/i.test(code)
    ? await db.chapel.findFirst({ where: { code: code.toUpperCase(), status: "ACTIVE", isPublic: true }, select: { coverPath: true } })
    : null;
  const file = chapel?.coverPath ? await readStored(chapel.coverPath) : null;
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
