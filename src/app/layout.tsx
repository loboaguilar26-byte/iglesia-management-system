import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NativeBridge } from "@/components/native-bridge";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Eclaria", template: "%s · Eclaria" },
  description: "Plataforma de gestión para comunidades de fe.",
  applicationName: "Eclaria",
  icons: {
    icon: [{ url: "/app-icon/192", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/app-icon/192", sizes: "192x192" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Eclaria" },
  formatDetection: { telephone: false },
};

// Ajustes para celulares: color de la barra del sistema y uso de toda la pantalla (muescas).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2a1a10" },
    { media: "(prefers-color-scheme: dark)", color: "#120b07" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de abajo fija `data-theme` antes de que React hidrate.
    <html lang="es-MX" className={`${inter.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer pintado (evita el parpadeo claro/oscuro). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
        <NativeBridge />
      </body>
    </html>
  );
}
