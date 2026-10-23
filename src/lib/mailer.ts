type Mail = { to: string; subject: string; text: string };

/**
 * Envío de correo. Aún no hay proveedor SMTP conectado (fase posterior).
 * - Desarrollo/pruebas: el mensaje se imprime en la consola del servidor.
 * - Producción: se registra que no se pudo enviar, SIN el contenido (puede contener tokens).
 */
export async function sendMail(mail: Mail): Promise<{ delivered: boolean }> {
  if (process.env.NODE_ENV !== "production") {
    console.info(`\n[correo de desarrollo] Para: ${mail.to}\nAsunto: ${mail.subject}\n${mail.text}\n`);
    return { delivered: true };
  }
  console.warn(`[correo] No hay proveedor de correo configurado; no se envió "${mail.subject}".`);
  return { delivered: false };
}
