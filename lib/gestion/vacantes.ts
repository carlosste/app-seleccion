"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { sembrarRequisitosPorDefecto, sembrarRubricaSiFalta } from "./acciones-configuracion";
import type { EstadoPublicar, EstadoVacante } from "./estados";
import { type RequisitoPropuesto, proponerRequisitos } from "./requisitos-por-defecto";

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

  // Requisitos propios del cargo (bodeguero, auxiliar de enfermería…), no unos fijos.
  // Si la IA falla, la vacante se crea igual y se avisa en la pestaña Requisitos.
  let requisitos: RequisitoPropuesto[] | undefined;
  try {
    requisitos = await proponerRequisitos(cargo, descripcion);
  } catch (errorIa) {
    console.error("[ia] proponerRequisitos", errorIa);
  }

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

  await sembrarRequisitosPorDefecto(vacante.id, requisitos);
  await sembrarRubricaSiFalta(vacante.id);

  redirect(`/gestion/${vacante.id}${requisitos ? "" : "?aviso=requisitos-ia"}`);
}

// Descripción pública de la vacante: es lo único que ve el postulante además del cargo.
// La redacta la empresa (puede pedir un borrador a la IA y ajustarlo). Los requisitos
// mínimos nunca van aquí: son internos.
export async function guardarDescripcion(vacanteId: string, texto: string): Promise<{ ok: boolean; mensaje: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(vacanteId)) return { ok: false, mensaje: "Vacante no válida." };
  const descripcion = texto.trim();
  if (descripcion.length > 2000) return { ok: false, mensaje: "La descripción admite hasta 2000 caracteres." };

  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vacantes")
    .update({ descripcion: descripcion || null })
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[vacante] descripcion", error);
    return { ok: false, mensaje: "No pudimos guardar la descripción. Intenta de nuevo." };
  }

  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true, mensaje: "Descripción guardada. Así la ven los postulantes." };
}

type Resultado = { ok: boolean; mensaje: string };

// Elimina una vacante SIN postulantes (decisión de Carlos, 2026-10-28). La función de la
// base revisa el rol, la empresa y que no tenga postulaciones, con el mismo candado que
// usa una postulación nueva. Etapas, requisitos, rúbrica y preguntas se van en cascada.
export async function eliminarVacante(vacanteId: string): Promise<Resultado> {
  if (!/^[0-9a-f-]{36}$/i.test(vacanteId)) return { ok: false, mensaje: "Vacante no válida." };
  const { rol } = await requerirEmpresa();
  if (rol !== "gestion_humana") return { ok: false, mensaje: "Solo gestión humana puede eliminar vacantes." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("eliminar_vacante", { p_vacante: vacanteId });
  if (error) {
    console.error("[vacante] eliminar", error);
    const conocido = ["42501", "P0001", "P0002"].includes(error.code ?? "");
    return { ok: false, mensaje: conocido ? error.message : "No pudimos eliminar la vacante. Intenta de nuevo." };
  }
  revalidatePath("/gestion");
  return { ok: true, mensaje: "Vacante eliminada." };
}

// Una vacante con postulantes no se borra: se cierra. Deja de recibir postulaciones (el link
// público solo muestra vacantes abiertas) y sale de la lista, sin borrar datos de nadie.
export async function cerrarVacante(vacanteId: string): Promise<Resultado> {
  if (!/^[0-9a-f-]{36}$/i.test(vacanteId)) return { ok: false, mensaje: "Vacante no válida." };
  const { empresa, rol } = await requerirEmpresa();
  if (rol !== "gestion_humana") return { ok: false, mensaje: "Solo gestión humana puede cerrar vacantes." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vacantes")
    .update({ estado: "cerrada" })
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[vacante] cerrar", error);
    return { ok: false, mensaje: "No pudimos cerrar la vacante. Intenta de nuevo." };
  }
  revalidatePath("/gestion");
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true, mensaje: "Vacante cerrada." };
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
