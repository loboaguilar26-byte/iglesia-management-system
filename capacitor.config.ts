import "dotenv/config";
import type { CapacitorConfig } from "@capacitor/cli";

/*
 * App móvil (Android e iOS) con Capacitor: un contenedor nativo que abre el sistema web.
 * La URL del servidor se toma de CAP_SERVER_URL al sincronizar (`pnpm mobile:sync`):
 *   - Pruebas en red local:  http://<IP de tu PC>:3000   (ver docs/movil.md)
 *   - Producción:            https://<dominio publicado>
 * Si el servidor no responde se muestra mobile/www/index.html (pantalla sin conexión).
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "http://192.168.0.50:3000";
const cleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "mx.igletech.app",
  appName: "Eclaria",
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    // HTTP sin cifrar solo se permite para pruebas en la red local.
    cleartext,
    errorPath: "index.html",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#08111f",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#08111f",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#08111f",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#08111f",
    },
  },
};

export default config;
