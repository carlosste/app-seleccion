"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { sembrarRequisitosPorDefecto, sembrarRubricaSiFalta } from "./acciones-configuracion";
import type { EstadoPublicar, EstadoVacante } from "./estados";

// Etapas por defecto de toda vacante nueva. La revisión del CV es automática y no es una etapa.
const ETAPAS_POR_DEFECTO = ["texto", "voz", "entrevista"] as const;

// Crea la vacante en borrador (no aparece en el link público) con sus etapas.
// La sesión de la empresa decide la empresa y quién la crea; RLS lo vuelve a comprobar.
export async function crearVacante(_previo: EstadoVacante, fd: FormData): Promise<EstadoVacante> {
  const cargo = String(fd.get("cargo") ?? "").trim();
  const descripcion = String(fd.get("descripcion") ?? "").trim();

  const errores: { cargo?: string; descripcion?: string } = {};
  if (cargo.length < 3 || cargo.length > 120) errores.cargo = "Escribe el cargo (entre 3 y 120 caracteres).";
  if (descripcion.length > 2000) errores.descripcion = "Máximo 2000 caracteres.";
  if (Object.keys(errores).length) return { estado: "error", errores };

  const sesion = await requerirEmpresa();
  const supabase = await crearClienteServidor();

  const { data: vacante, error } = await supabase
    .from("vacantes")
    .insert({
      empresa_id: sesion.empresa.id,
      cargo,
      descripcion: descripcion || null,
      estado: "borrador",
      creado_por: sesion.usuarioId,
    })
    .select("id")
    .single();

  if (error || !vacante) {
    console.error("[vacante] insert", error);
    return { estado: "error", mensaje: "No pudimos crear la vacante. Intenta de nuevo en unos minutos." };
  }

  const { error: errorEtapas } = await supabase.from("vacante_etapas").insert(
    ETAPAS_POR_DEFECTO.map((tipo, i) => ({ vacante_id: vacante.id, tipo, orden: i + 1 })),
  );
  if (errorEtapas) {
    console.error("[vacante] etapas", errorEtapas);
    return {
      estado: "error",
      mensaje: "La vacante se creó, pero no pudimos agregar sus etapas. Revísala desde la lista de vacantes.",
    };
  }

  await sembrarRequisitosPorDefecto(vacante.id);
  await sembrarRubricaSiFalta(vacante.id);

  redirect(`/gestion/${vacante.id}`);
}

// Pasa la vacante de borrador a abierta: desde ese momento su link público recibe postulaciones.
export async function publicarVacante(_previo: EstadoPublicar, fd: FormData): Promise<EstadoPublicar> {
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { estado: "error", mensaje: "Vacante no válida." };

  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vacantes")
    .update({ estado: "abierta" })
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[vacante] publicar", error);
    return { estado: "error", mensaje: "No pudimos publicar la vacante. Intenta de nuevo." };
  }

  revalidatePath(`/gestion/${id}`, "layout");
  revalidatePath("/gestion");
  return { estado: "ok" };
}
