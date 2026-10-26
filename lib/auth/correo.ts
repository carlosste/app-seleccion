import "server-only";

// Envío de correos con Resend (ya está en el stack). Sin dependencia extra: API HTTP.
// En desarrollo, si no hay RESEND_API_KEY, el enlace se imprime en la consola del servidor.
export async function enviarEnlaceConfirmacion(destino: string, enlace: string, nombreEmpresa?: string) {
  const claveApi = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE ?? "Selección <onboarding@resend.dev>";

  if (!claveApi) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta RESEND_API_KEY");
    console.info(`\n[correo de desarrollo] Confirmación para ${destino}:\n${enlace}\n`);
    return;
  }

  const saludo = nombreEmpresa ? `la cuenta de <b>${escapar(nombreEmpresa)}</b>` : "tu cuenta de empresa";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${claveApi}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remitente,
      to: [destino],
      subject: "Confirma tu correo para activar la cuenta",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1a1d23;line-height:1.5">
          <p>Hola,</p>
          <p>Para activar ${saludo} en la app de selección, confirma tu correo:</p>
          <p><a href="${enlace}" style="display:inline-block;padding:12px 18px;background:#2457C5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Confirmar correo</a></p>
          <p style="color:#5b6270;font-size:13px">El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
        </div>`,
    }),
  });
  if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`);
}

function escapar(t: string) {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
