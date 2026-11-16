// Registro de errores del servidor sin datos personales (2026-11-16). Los registros terminan en
// Vercel: un error de Supabase trae en "details" los valores de la fila (por ejemplo
// "Key (correo)=(...) already exists"), y un error de Auth o de la IA puede traer texto del
// usuario. Aquí solo se guarda el tipo, el código, el estado y el mensaje.
export function registrarError(etiqueta: string, error: unknown): void {
  if (error == null) {
    console.error(etiqueta);
    return;
  }
  if (typeof error !== "object") {
    console.error(etiqueta, String(error).slice(0, 200));
    return;
  }
  const e = error as { name?: unknown; code?: unknown; status?: unknown; message?: unknown };
  const partes = [
    typeof e.name === "string" && e.name !== "Error" ? e.name : null,
    e.code != null ? `código ${String(e.code)}` : null,
    e.status != null ? `estado ${String(e.status)}` : null,
    typeof e.message === "string" ? e.message.slice(0, 200) : null,
  ].filter(Boolean);
  console.error(etiqueta, partes.join(" · ") || "error sin mensaje");
}
