"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJson } from "@/lib/ia/gemini";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Preguntas por etapa. La IA las propone según el cargo, la descripción y la rúbrica,
// o de enfoque social (situaciones cotidianas). La empresa puede editarlas, quitarlas
// o escribir las suyas. Regenerar reemplaza solo las que creó la IA.

type Resultado = { ok: true } | { ok: false; mensaje: string };
type Enfoque = "cargo" | "social";
type Modo = Enfoque | "mixta";

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
const INSTRUCCION_ENFOQUE: Record<Modo, string> = {
  cargo: "Todas las preguntas deben estar relacionadas con el cargo, su descripción y los criterios de la rúbrica. Marca enfoque \"cargo\".",
  social:
    "Todas las preguntas son sociales o situacionales: preguntan cómo reaccionaría la persona ante situaciones de la vida " +
    "cotidiana o del trabajo que no son técnicas. Marca enfoque \"social\".",
  mixta:
    "Mezcla preguntas relacionadas con el cargo (enfoque \"cargo\") y preguntas sociales o situacionales " +
    "(enfoque \"social\"), más o menos la mitad de cada una.",
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

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

// Todos los postulantes de una etapa responden las mismas preguntas (decisión de Carlos,
// 2026-10-28): la primera etapa se bloquea al publicar y las demás cuando alguien llega.
// La base lo vuelve a exigir con un trigger; esto solo da un mensaje claro y evita gastar
// tokens en preguntas que no se podrían guardar.
async function motivoBloqueo(supabase: Cliente, etapaId: string): Promise<string | null> {
  const { data: bloqueada, error } = await supabase.rpc("etapa_bloqueada", { p_etapa: etapaId });
  if (error) {
    console.error("[preguntas] etapa_bloqueada", error);
    return "No pudimos comprobar si la etapa está bloqueada. Intenta de nuevo.";
  }
  if (!bloqueada) return null;
  const { data: llegaron } = await supabase.rpc("postulantes_en_etapa", { p_etapa: etapaId });
  return Number(llegaron) > 0
    ? `Las preguntas de esta etapa están bloqueadas: ${llegaron} postulante(s) ya llegaron a ella.`
    : "Las preguntas de la primera etapa se bloquean al publicar la vacante: todos responden las mismas.";
}

async function etapaDePregunta(supabase: Cliente, id: string, vacanteId: string): Promise<string | null> {
  const { data } = await supabase
    .from("preguntas")
    .select("etapa_id")
    .eq("id", id)
    .eq("vacante_id", vacanteId)
    .maybeSingle<{ etapa_id: string }>();
  return data?.etapa_id ?? null;
}

function textoValido(texto: string): string | null {
  const limpio = texto.trim();
  return limpio && limpio.length <= LARGO_PREGUNTA ? limpio : null;
}

function enfoqueValido(valor: string): Enfoque | null {
  return valor === "cargo" || valor === "social" ? valor : null;
}

export async function generarPreguntas(vacanteId: string, etapaId: string, modo: string): Promise<Resultado> {
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };
  const { supabase, vacante } = acceso;
  if (modo !== "cargo" && modo !== "social" && modo !== "mixta") return { ok: false, mensaje: "Enfoque no válido." };
  // Regenerar borra las preguntas de la IA. Si la etapa está bloqueada ni se llama a Gemini.
  const bloqueo = await motivoBloqueo(supabase, etapaId);
  if (bloqueo) return { ok: false, mensaje: bloqueo };

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
    `más complejas y profundas son las preguntas. ${INSTRUCCION_ENFOQUE[modo]} ` +
    'Devuelve {"preguntas": [{"texto": "...", "enfoque": "cargo" | "social"}]}.';
  const datos =
    `Cargo: ${vacante.cargo}\n` +
    `Descripción del cargo: ${vacante.descripcion?.trim() || "(sin descripción)"}\n` +
    `Criterios de la rúbrica: ${(criterios ?? []).map((c) => c.nombre).join(", ") || "(sin criterios)"}`;

  let generadas: { texto: string; enfoque: Enfoque }[];
  try {
    const r = await pedirJson<{ preguntas: { texto: string; enfoque?: string }[] }>(instruccion, datos);
    generadas = (r.preguntas ?? [])
      .map((p) => ({
        texto: textoValido(String(p.texto ?? "")),
        enfoque: enfoqueValido(String(p.enfoque ?? "")) ?? (modo === "mixta" ? "cargo" : modo),
      }))
      .filter((p): p is { texto: string; enfoque: Enfoque } => p.texto !== null)
      .slice(0, 10);
  } catch (error) {
    console.error("[ia] generarPreguntas", error);
    return { ok: false, mensaje: "No pudimos generar las preguntas con IA. Intenta de nuevo en unos minutos." };
  }
  if (generadas.length === 0) return { ok: false, mensaje: "La IA no devolvió preguntas. Intenta de nuevo." };

  // Se reemplazan solo las de la IA; las escritas a mano se conservan.
  const { error: errorBorrar } = await supabase.from("preguntas").delete().eq("etapa_id", etapa.id).eq("origen", "ia");
  if (errorBorrar) {
    console.error("[preguntas] borrar anteriores", errorBorrar);
    return { ok: false, mensaje: "No pudimos reemplazar las preguntas anteriores." };
  }

  const { data: ultima } = await supabase
    .from("preguntas")
    .select("orden")
    .eq("etapa_id", etapa.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();
  const inicio = ultima?.orden ?? 0;
  const { error } = await supabase.from("preguntas").insert(
    generadas.map((p, i) => ({
      vacante_id: vacanteId,
      etapa_id: etapa.id,
      texto: p.texto,
      tipo: TIPO_PREGUNTA[etapa.tipo],
      enfoque: p.enfoque,
      orden: inicio + i + 1,
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

export async function agregarPreguntaManual(
  vacanteId: string,
  etapaId: string,
  texto: string,
  enfoque: string,
): Promise<Resultado> {
  const limpio = textoValido(texto);
  if (!limpio) return { ok: false, mensaje: `La pregunta necesita entre 1 y ${LARGO_PREGUNTA} caracteres.` };
  const enfoqueOk = enfoqueValido(enfoque);
  if (!enfoqueOk) return { ok: false, mensaje: "Enfoque no válido." };
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };
  const { supabase } = acceso;

  const { data: etapa } = await supabase
    .from("vacante_etapas")
    .select("tipo")
    .eq("id", etapaId)
    .eq("vacante_id", vacanteId)
    .maybeSingle<{ tipo: string }>();
  if (!etapa || etapa.tipo === "cv") return { ok: false, mensaje: "Esta etapa no admite preguntas." };
  const bloqueo = await motivoBloqueo(supabase, etapaId);
  if (bloqueo) return { ok: false, mensaje: bloqueo };

  const { data: ultima } = await supabase
    .from("preguntas")
    .select("orden")
    .eq("etapa_id", etapaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();
  const { error } = await supabase.from("preguntas").insert({
    vacante_id: vacanteId,
    etapa_id: etapaId,
    texto: limpio,
    tipo: TIPO_PREGUNTA[etapa.tipo],
    enfoque: enfoqueOk,
    orden: (ultima?.orden ?? 0) + 1,
    origen: "manual",
  });
  if (error) {
    console.error("[preguntas] manual", error);
    return { ok: false, mensaje: "No pudimos guardar la pregunta." };
  }
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true };
}

export async function guardarPregunta(id: string, vacanteId: string, texto: string, enfoque: string): Promise<Resultado> {
  const limpio = textoValido(texto);
  if (!limpio) return { ok: false, mensaje: `La pregunta necesita entre 1 y ${LARGO_PREGUNTA} caracteres.` };
  const enfoqueOk = enfoqueValido(enfoque);
  if (!enfoqueOk) return { ok: false, mensaje: "Enfoque no válido." };
  const acceso = await clienteDeVacante(vacanteId);
  if (!acceso) return { ok: false, mensaje: "Vacante no encontrada." };
  const etapaId = await etapaDePregunta(acceso.supabase, id, vacanteId);
  if (!etapaId) return { ok: false, mensaje: "Pregunta no encontrada." };
  const bloqueo = await motivoBloqueo(acceso.supabase, etapaId);
  if (bloqueo) return { ok: false, mensaje: bloqueo };

  const { error } = await acceso.supabase
    .from("preguntas")
    .update({ texto: limpio, enfoque: enfoqueOk })
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
  const etapaId = await etapaDePregunta(acceso.supabase, id, vacanteId);
  if (!etapaId) return { ok: false, mensaje: "Pregunta no encontrada." };
  const bloqueo = await motivoBloqueo(acceso.supabase, etapaId);
  if (bloqueo) return { ok: false, mensaje: bloqueo };

  const { error } = await acceso.supabase.from("preguntas").delete().eq("id", id).eq("vacante_id", vacanteId);
  if (error) {
    console.error("[preguntas] delete", error);
    return { ok: false, mensaje: "No pudimos quitar la pregunta." };
  }
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true };
}
