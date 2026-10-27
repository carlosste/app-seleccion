"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJson } from "@/lib/ia/gemini";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Preguntas por etapa. La IA las propone según el cargo, la descripción y la rúbrica;
// la empresa puede editarlas o quitarlas. Regenerar reemplaza solo las de la IA.

type Resultado = { ok: true } | { ok: false; mensaje: string };

const UUID = /^[0-9a-f-]{36}$/i;
const NUMERO_PREGUNTAS = 5;
const LARGO_PREGUNTA = 500;

// La entrevista se hace hablada, así que sus preguntas se guardan como "voz".
const TIPO_PREGUNTA: Record<string, "texto" | "voz"> = { texto: "texto", voz: "voz", entrevista: "voz" };
const FORMA_DE_RESPONDER: Record<string, string> = {
  texto: "preguntas que el postulante responde por escrito",
  voz: "preguntas que el postulante responde en una grabación de voz breve",
  entrevista: "preguntas para una entrevista con una persona de la empresa",
};

async function clienteDeVacante(vacanteId: string) {
  if (!UUID.test(vacanteId)) return null;
  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("vacantes")
    .select("id, cargo, descripcion")
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .maybeSingle<{ id: string; cargo: string; descripcion: string | null }>();
  return data ? { supabase, vacante: data } : null;
}

export async function generarPreguntas(vacanteId: string, etapaId: string): Promise<Resultado> {
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };
  const { supabase, vacante } = acceso;

  const { data: etapas } = await supabase
    .from("vacante_etapas")
    .select("id, tipo, orden")
    .eq("vacante_id", vacanteId)
    .order("orden")
    .returns<{ id: string; tipo: string; orden: number }[]>();
  const posicion = (etapas ?? []).findIndex((e) => e.id === etapaId);
  const etapa = posicion >= 0 ? etapas![posicion] : undefined;
  if (!etapa) return { ok: false, mensaje: "Etapa no encontrada." };
  if (etapa.tipo === "cv") return { ok: false, mensaje: "La revisión de CV no tiene preguntas." };

  const { data: rubrica } = await supabase
    .from("rubricas")
    .select("id")
    .eq("vacante_id", vacanteId)
    .maybeSingle<{ id: string }>();
  const { data: criterios } = rubrica
    ? await supabase.from("criterios").select("nombre").eq("rubrica_id", rubrica.id).returns<{ nombre: string }[]>()
    : { data: [] as { nombre: string }[] };

  const instruccion =
    `Genera ${NUMERO_PREGUNTAS} ${FORMA_DE_RESPONDER[etapa.tipo]} para una etapa de selección. ` +
    `La etapa es la ${posicion + 1} de ${etapas!.length} del proceso: mientras más avanzada la etapa, ` +
    "más complejas y profundas son las preguntas. Las preguntas deben estar relacionadas con el cargo, " +
    "la descripción del cargo y los criterios de la rúbrica. Devuelve {\"preguntas\": [\"...\"]}.";
  const datos =
    `Cargo: ${vacante.cargo}\n` +
    `Descripción del cargo: ${vacante.descripcion?.trim() || "(sin descripción)"}\n` +
    `Criterios de la rúbrica: ${(criterios ?? []).map((c) => c.nombre).join(", ") || "(sin criterios)"}`;

  let textos: string[];
  try {
    const r = await pedirJson<{ preguntas: string[] }>(instruccion, datos);
    textos = (r.preguntas ?? [])
      .map((t) => String(t).trim().slice(0, LARGO_PREGUNTA))
      .filter(Boolean)
      .slice(0, 10);
  } catch (error) {
    console.error("[ia] generarPreguntas", error);
    return { ok: false, mensaje: "No pudimos generar las preguntas con IA. Intenta de nuevo en unos minutos." };
  }
  if (textos.length === 0) return { ok: false, mensaje: "La IA no devolvió preguntas. Intenta de nuevo." };

  const { error: errorBorrar } = await supabase
    .from("preguntas")
    .delete()
    .eq("etapa_id", etapa.id)
    .eq("origen", "ia");
  if (errorBorrar) {
    console.error("[preguntas] borrar anteriores", errorBorrar);
    return { ok: false, mensaje: "No pudimos reemplazar las preguntas anteriores." };
  }

  const { error } = await supabase.from("preguntas").insert(
    textos.map((texto, i) => ({
      vacante_id: vacanteId,
      etapa_id: etapa.id,
      texto,
      tipo: TIPO_PREGUNTA[etapa.tipo],
      orden: i + 1,
      origen: "ia",
    })),
  );
  if (error) {
    console.error("[preguntas] insert", error);
    return { ok: false, mensaje: "No pudimos guardar las preguntas." };
  }

  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true };
}

export async function guardarPregunta(id: string, vacanteId: string, texto: string): Promise<Resultado> {
  const limpio = texto.trim();
  if (!limpio || limpio.length > LARGO_PREGUNTA) {
    return { ok: false, mensaje: `La pregunta necesita entre 1 y ${LARGO_PREGUNTA} caracteres.` };
  }
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };

  const { error } = await acceso.supabase
    .from("preguntas")
    .update({ texto: limpio })
    .eq("id", id)
    .eq("vacante_id", vacanteId);
  if (error) {
    console.error("[preguntas] update", error);
    return { ok: false, mensaje: "No pudimos guardar la pregunta." };
  }
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true };
}

export async function quitarPregunta(id: string, vacanteId: string): Promise<Resultado> {
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };

  const { error } = await acceso.supabase.from("preguntas").delete().eq("id", id).eq("vacante_id", vacanteId);
  if (error) {
    console.error("[preguntas] delete", error);
    return { ok: false, mensaje: "No pudimos quitar la pregunta." };
  }
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true };
}
