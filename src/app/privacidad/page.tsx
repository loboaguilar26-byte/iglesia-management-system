import { PublicSection, PublicShell } from "@/components/public-site";
import { getPublicSite } from "@/modules/public/service";

export default async function PrivacyPage() { const { settings } = await getPublicSite(); return <PublicShell name={settings.name}><PublicSection title="Aviso de privacidad"><p className="max-w-3xl whitespace-pre-line text-muted">{settings.privacyNotice ?? "La iglesia publicará aquí su aviso de privacidad."}</p></PublicSection></PublicShell>; }
