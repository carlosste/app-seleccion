"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { detectarManipulacion, enmascararDatosPersonales } from "@/lib/ia/proteccion";
import { registrarError } from "@/lib/registro";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { anonimizar, hablantes, LARGO_MAXIMO_TRANSCRIPCION, leerTranscripcion, SIN_IDENTIFICAR } from "@/lib/transcripcion";
import { sembrarRubricaSiFalta } from "./acciones-configuracion";
import { analizarEntrevistaIa, type Criterio } from "./calificacion-ia";

// Entrevista (2026-11-19, Carlos): se hace en Teams, Meet o Zoom; gestión humana pega o sube la
// transcripción en el detalle del postulante y la IA la analiza con la rúbrica del cargo.
// Igual que "Evaluar con IA": se comprueba que la vacante y la postulación sean de la empresa de
// la sesión, y la transcripción y el análisis los escribe el servidor con la service role.

type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

const UUID = /^[0-9a-f-]{36}$/i;
// Menos que esto no alcanza para analizar una entrevista (unas 60 palabras).
const MINIMO_CARACTERES = 300;

async function postulacionDeMiEmpresa(vacanteId: string, postulacionId: string) {
  if (!UUID.test(vacanteId) || !UUID.test(postulacionId)) return null;
  const sesion = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data: vacante } = await supabase
    .from("vacantes")
    .select("id, cargo, descripcion")
    .eq("id", vacanteId)
    .eq("empresa_id", sesion.empresa.id)
    .maybeSingle<{ id: string; cargo: string; descripcion: string | null }>();
  if (!vacante) return null;
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("id", postulacionId)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string }>();
  if (!postulacion) return null;
  return { sesion, supabase, vacante, postulacionId: postulacion.id };
}

async function registrar(empresaId: string, usuarioId: string, accion: string, registroId: string) {
  const { error } = await crearClienteAdmin()
    .from("registro_actividad")
    .insert({ empresa_id: empresaId, usuario_id: usuarioId, accion, tabla: "entrevistas", registro_id: registroId });
  if (error) registrarError(`[entrevista] registro ${accion}`, error);
}

export async function guardarTranscripcion(
  vacanteId: string,
  postulacionId: string,
  texto: string,
  hablanteCandidato: string,
): Promise<Resultado> {
  const ctx = await postulacionDeMiEmpresa(vacanteId, postulacionId);
  if (!ctx) return { ok: false, mensaje: "Postulación no encontrada." };

  const limpio = String(texto ?? "").replace(/\u0000/g, "").trim();
  if (limpio.length < MINIMO_CARACTERES) {
    return { ok: false, mensaje: "La transcripción es muy corta. Pega la conversación completa de la entrevista." };
  }
  if (limpio.length > LARGO_MAXIMO_TRANSCRIPCION) {
    return { ok: false, mensaje: "La transcripción supera los 200.000 caracteres (unas dos horas). Quita lo que no sea de la entrevista." };
  }
  // El candidato tiene que ser uno de los hablantes que se leen en el texto.
  const nombres = hablantes(leerTranscripcion(limpio)).map((h) => h.nombre);
  const candidato = String(hablanteCandidato ?? "").trim();
  if (!nombres.includes(candidato)) return { ok: false, mensaje: "Elige quién es el candidato en la transcripción." };

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("entrevistas")
    .upsert(
      {
        postulacion_id: ctx.postulacionId,
        entrevistador_id: ctx.sesion.usuarioId,
        transcripcion: limpio,
        hablante_candidato: candidato,
        actualizada_at: new Date().toISOString(),
      },
      { onConflict: "postulacion_id" },
    )
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    registrarError("[entrevista] guardar", error);
    return { ok: false, mensaje: "No pudimos guardar la transcripción. Intenta de nuevo." };
  }
  await registrar(ctx.sesion.empresa.id, ctx.sesion.usuarioId, "guardar_transcripcion", data.id);
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true, mensaje: "Transcripción guardada." };
}

export async function analizarEntrevista(vacanteId: string, postulacionId: string): Promise<Resultado> {
  const ctx = await postulacionDeMiEmpresa(vacanteId, postulacionId);
  if (!ctx) return { ok: false, mensaje: "Postulación no encontrada." };
  const { supabase, vacante } = ctx;

  const { data: entrevista } = await supabase
    .from("entrevistas")
    .select("id, transcripcion, hablante_candidato")
    .eq("postulacion_id", ctx.postulacionId)
    .maybeSingle<{ id: string; transcripcion: string | null; hablante_candidato: string | null }>();
  if (!entrevista?.transcripcion) return { ok: false, mensaje: "Primero guarda la transcripción de la entrevista." };

  await sembrarRubricaSiFalta(vacante.id);
  const [{ data: rubrica }, { data: etapas }] = await Promise.all([
    supabase.from("rubricas").select("id").eq("vacante_id", vacante.id).maybeSingle<{ id: string }>(),
    supabase
      .from("vacante_etapas")
      .select("id, tipo, orden")
      .eq("vacante_id", vacante.id)
      .order("orden")
      .returns<{ id: string; tipo: string; orden: number }[]>(),
  ]);
  const { data: criterios } = rubrica
    ? await supabase.from("criterios").select("nombre, descripcion, peso").eq("rubrica_id", rubrica.id).order("created_at").returns<Criterio[]>()
    : { data: [] as Criterio[] };
  if (!criterios?.length) return { ok: false, mensaje: "La vacante no tiene criterios en la rúbrica." };

  // Nombres cambiados por papeles y datos personales ocultos antes de que salga del servidor.
  const candidato = entrevista.hablante_candidato ?? SIN_IDENTIFICAR;
  // Primero correos, teléfonos y documentos; después los nombres (si no, "[nombre]@correo.com").
  const leidos = leerTranscripcion(entrevista.transcripcion).map((t) => ({ ...t, texto: enmascararDatosPersonales(t.texto) }));
  const turnos = anonimizar(leidos, candidato).map((t, i) => ({
    turno: i + 1,
    quien: t.quien,
    texto: t.texto,
    esCandidato: t.esCandidato,
  }));
  if (!turnos.some((t) => t.esCandidato)) return { ok: false, mensaje: "No encontramos intervenciones del candidato en la transcripción." };

  const etapaEntrevista = (etapas ?? []).find((e) => e.tipo === "entrevista")?.id ?? null;
  let analisis: Awaited<ReturnType<typeof analizarEntrevistaIa>>;
  try {
    analisis = await analizarEntrevistaIa(vacante, criterios, turnos, etapaEntrevista);
  } catch (error) {
    registrarError("[ia] analizarEntrevista", error);
    return { ok: false, mensaje: "No pudimos analizar la entrevista con la IA. Intenta de nuevo en unos minutos." };
  }
  // Defensa extra: si la transcripción trae instrucciones para la IA, se marca aunque la IA no lo haga.
  if (!analisis.resultado.sospecha) {
    const motivo = detectarManipulacion(turnos.filter((t) => t.esCandidato).map((t) => t.texto));
    if (motivo) Object.assign(analisis.resultado, { sospecha: true, motivoSospecha: `Detector del servidor: ${motivo}.` });
  }

  const { error } = await crearClienteAdmin().from("evaluaciones_ia").upsert(
    {
      postulacion_id: ctx.postulacionId,
      tarea: "analizar_entrevista",
      resultado: analisis.resultado,
      ajuste_total: analisis.resultado.ajuste,
      modelo: analisis.modelo,
      created_at: new Date().toISOString(),
    },
    { onConflict: "postulacion_id,tarea" },
  );
  if (error) {
    registrarError("[ia] guardar analizar_entrevista", error);
    return { ok: false, mensaje: "No pudimos guardar el análisis de la entrevista." };
  }
  await registrar(ctx.sesion.empresa.id, ctx.sesion.usuarioId, "analizar_entrevista", entrevista.id);
  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return {
    ok: true,
    mensaje: analisis.resultado.sospecha
      ? "Entrevista analizada. Atención: posible intento de manipular la evaluación; revísala a mano."
      : "Entrevista analizada.",
  };
}
