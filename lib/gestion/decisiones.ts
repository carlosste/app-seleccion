"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

const UUID = /^[0-9a-f-]{36}$/i;
const LARGO_MOTIVO = 500;

const MENSAJES: Record<string, string> = {
  avanza: "Listo: pasó a la siguiente etapa.",
  seleccionada: "Listo: quedó seleccionado. Era la última etapa.",
  descartada: "Listo: no continúa en el proceso.",
};

// "Pasa" o "No pasa" de gestión humana. La IA nunca decide aquí. La función de la base
// (decidir_postulacion) revisa el rol, que la postulación sea de la empresa y que siga en
// proceso; guarda la decisión y mueve la etapa en una sola transacción.
export async function decidir(
  vacanteId: string,
  postulacionId: string,
  resultado: "pasa" | "no_pasa",
  motivo: string,
): Promise<Resultado> {
  if (!UUID.test(vacanteId) || !UUID.test(postulacionId)) return { ok: false, mensaje: "Postulación no encontrada." };
  if (resultado !== "pasa" && resultado !== "no_pasa") return { ok: false, mensaje: "Decisión no válida." };
  if (motivo.length > LARGO_MOTIVO) return { ok: false, mensaje: `El motivo admite hasta ${LARGO_MOTIVO} caracteres.` };

  const { rol } = await requerirEmpresa();
  if (rol !== "gestion_humana") return { ok: false, mensaje: "Solo gestión humana puede decidir." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("decidir_postulacion", {
    p_postulacion: postulacionId,
    p_resultado: resultado,
    p_motivo: motivo.trim() || null,
  });
  if (error) {
    console.error("[decision]", error);
    // Mensajes propios de la función (rol, postulación ajena o ya decidida).
    const conocido = ["42501", "P0001", "P0002"].includes(error.code ?? "");
    return { ok: false, mensaje: conocido ? error.message : "No pudimos guardar la decisión. Intenta de nuevo." };
  }

  revalidatePath(`/gestion/${vacanteId}`, "layout");
  revalidatePath("/gestion");
  return { ok: true, mensaje: MENSAJES[String(data)] ?? "Decisión guardada." };
}
