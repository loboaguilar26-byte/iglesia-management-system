import type { NextConfig } from "next";

// 'unsafe-eval' solo lo necesita el servidor de desarrollo (recarga en caliente); en producción no.
const scriptSrc = process.env.NODE_ENV === "production" ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Bibliotecas de Node que leen sus propios archivos (fuentes de PDF): no se empaquetan.
  serverExternalPackages: ["pdfkit", "exceljs"],
  // En desarrollo, permite abrir el sitio desde la app móvil por la red local (ver docs/movil.md).
  allowedDevOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/^https?:\/\//, "").replace(/:\d+$/, ""))
    .filter(Boolean),
  experimental: {
    // Subida de imágenes por Server Actions: logotipo (1 MB) y foto de portada (3 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Política de contenido (aporte de Victor): solo recursos del propio sitio.
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
