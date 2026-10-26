import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "Iglesia", template: "%s · Iglesia" },
  description: "Sitio y sistema de gestión de la iglesia.",
  applicationName: "Iglesia",
  icons: {
    icon: [{ url: "/app-icon/192", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/app-icon/192", sizes: "192x192" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Iglesia" },
  formatDetection: { telephone: false },
};

// Ajustes para celulares: color de la barra del sistema y uso de toda la pantalla (muescas).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#13233d" },
    { media: "(prefers-color-scheme: dark)", color: "#0a101b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
