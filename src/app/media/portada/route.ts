import { connection } from "next/server";
import { readStored } from "@/lib/storage";
import { getSettingsInternal } from "@/modules/settings/service";

// Foto de portada del sitio público (pública por naturaleza).
export async function GET() {
  await connection();
  const { coverPath } = await getSettingsInternal();
  const file = coverPath ? await readStored(coverPath) : null;
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
