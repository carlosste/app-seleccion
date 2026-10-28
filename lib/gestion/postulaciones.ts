import "server-only";
import type { crearClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

export const MENSAJE_CON_POSTULACIONES =
  "Esta vacante ya recibió postulaciones: ese cambio borraría o desordenaría sus respuestas.";

// Borrar una etapa o una pregunta borra en cascada las respuestas de los postulantes.
// Si falla el conteo, se asume que sí hay postulaciones (mejor bloquear que borrar).
export async function tienePostulaciones(supabase: Cliente, vacanteId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("postulaciones")
    .select("id", { count: "exact", head: true })
    .eq("vacante_id", vacanteId);
  if (error) console.error("[postulaciones] contar", error);
  return error ? true : (count ?? 0) > 0;
}
