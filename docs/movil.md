# App móvil (Android e iOS)

IgleTech se distribuye también como app nativa con [Capacitor](https://capacitorjs.com/) 8. La app es un
contenedor nativo que abre el sistema web publicado: el sitio público, el panel y el portal del miembro
son los mismos, así que toda mejora del sistema llega a la app sin publicar otra versión.

| Pieza | Dónde |
|---|---|
| Configuración (id `mx.igletech.app`, URL del servidor, colores) | `capacitor.config.ts` |
| Proyecto Android (Android Studio) | `android/` |
| Proyecto iOS (Xcode, Swift Package Manager) | `ios/` |
| Pantalla "sin conexión" incluida en la app | `mobile/www/index.html` |
| Íconos y pantalla de inicio | `assets/` → `pnpm mobile:assets` |
| Integración nativa en la web (botón atrás, barra de estado, splash) | `src/components/native-bridge.tsx` |

## Probar en un teléfono Android (red local)

1. La PC y el teléfono deben estar en la **misma red Wi-Fi**. Averigua la IP de la PC (`ipconfig` →
   "Dirección IPv4"; p. ej. `192.168.0.50`).
2. En `.env` pon esa IP:
   ```
   AUTH_TRUSTED_ORIGINS="http://192.168.0.50:3000"
   CAP_SERVER_URL="http://192.168.0.50:3000"
   ```
   `AUTH_TRUSTED_ORIGINS` permite iniciar sesión desde esa dirección; `CAP_SERVER_URL` es lo que abre la app.
3. Arranca el sistema: `pnpm dev`. Si Windows pregunta, permite que Node acepte conexiones en redes privadas.
4. Compila la APK de prueba (requiere Android Studio instalado; usa su JDK 21):
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   pnpm mobile:apk
   ```
   La APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
5. Pásala al teléfono (cable USB, Drive o correo) e instálala. Android pedirá permitir
   "instalar apps de fuentes desconocidas" para esa vez.

Alternativa: `pnpm mobile:android` abre el proyecto en Android Studio para ejecutarlo en un emulador o en
un teléfono conectado por USB (depuración USB activada). En el emulador la PC es `http://10.0.2.2:3000`.

> HTTP sin cifrar solo se habilita cuando `CAP_SERVER_URL` empieza con `http://` (pruebas locales).
> En producción usa siempre `https://`.

## iOS

El proyecto `ios/` ya está generado, pero **compilar para iPhone requiere una Mac con Xcode**:

1. En la Mac: `pnpm install` y `pnpm mobile:sync`.
2. `pnpm mobile:ios` abre Xcode. Elige tu equipo de firma (Apple ID) y ejecuta en un iPhone o en el simulador.

## Producción y tiendas (pendiente de autorización)

1. Publicar el sistema con HTTPS (p. ej. Firebase App Hosting, que necesita el plan Blaze).
2. `CAP_SERVER_URL="https://<dominio>"` y `pnpm mobile:sync`.
3. Google Play: cuenta de desarrollador (pago único de USD 25), firma de la app (keystore guardada fuera
   del repositorio) y `Build → Generate Signed App Bundle` en Android Studio.
4. App Store: Apple Developer Program (USD 99 al año), Xcode en Mac y revisión de Apple. Apple pide que
   la app aporte funciones de app (no solo un sitio web); el portal del miembro, la agenda y las
   notificaciones futuras ayudan a cumplirlo.

Ninguna cuenta de pago, llave de firma ni publicación se crea sin autorización expresa.

## Actualizar íconos

Con `pnpm dev` corriendo, descarga las imágenes base y regenera:

```bash
curl -o assets/icon-only.png "http://localhost:3000/app-icon/1024?maskable=1"
curl -o assets/logo.png "http://localhost:3000/app-icon/1024"
pnpm mobile:assets
```
