"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { sembrarRubricaSiFalta } from "./acciones-configuracion";
import { type Criterio, type Numerada, puntuarEtapa, revisarCv } from "./calificacion-ia";
import { NOMBRE_ETAPA } from "./datos";
import { type EvaluacionEtapa, type ResultadoCv, type ResultadoRubrica, VERSION_PUNTAJE } from "./tipos-evaluacion";

// "Evaluar con IA": gestión humana lo pide desde el detalle del postulante (así no se gastan
// tokens en cada postulación que llega). Hace dos cosas:
// 1. Lee el CV una sola vez y lo compara con los requisitos mínimos. Si no cumple, la base lo
//    descarta sola; si cumple y sigue en la revisión de CV, pasa a la siguiente etapa; si falta
//    un dato, queda "por revisar" y decide una persona.
// 2. Puntúa las respuestas con la rúbrica, citando evidencia. Solo vuelve a llamar a la IA si
//    hay respuestas nuevas desde la última vez.
// Las evaluaciones las escribe el servidor con la service role, después de comprobar que la
// postulación es de la empresa de la sesión.

type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };
type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

const UUID = /^[0-9a-f-]{36}$/i;

export async function evaluarPostulacion(vacanteId: string, postulacionId: string): Promise<Resultado> {
  if (!UUID.test(vacanteId) || !UUID.test(postulacionId)) return { ok: false, mensaje: "Postulación no encontrada." };
  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();

  const { data: vacante } = await supabase
    .from("vacantes")
    .select("id, cargo, descripcion")
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .maybeSingle<{ id: string; cargo: string; descripcion: string | null }>();
  if (!vacante) return { ok: false, mensaje: "Vacante no encontrada." };

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id, estado, cv_path")
    .eq("id", postulacionId)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string; estado: string; cv_path: string | null }>();
  if (!postulacion) return { ok: false, mensaje: "Postulación no encontrada." };
  if (postulacion.estado !== "en_proceso") {
    return { ok: false, mensaje: "Esta postulación ya tiene una decisión final: no se vuelve a evaluar." };
  }

  const { data: previas } = await supabase
    .from("evaluaciones_ia")
    .select("tarea, resultado")
    .eq("postulacion_id", postulacion.id)
    .returns<{ tarea: string; resultado: unknown }[]>();
  const admin = crearClienteAdmin();
  const hechos: string[] = [];

  // 1. CV: se analiza una sola vez por postulación.
  let cv = previas?.find((e) => e.tarea === "leer_cv")?.resultado as ResultadoCv | undefined;
  if (!cv) {
    if (!postulacion.cv_path) return { ok: false, mensaje: "Esta postulación no tiene hoja de vida." };
    let modeloCv: string;
    try {
      ({ cv, modelo: modeloCv } = await analizarCv(supabase, vacante, postulacion.cv_path));
    } catch (error) {
      console.error("[ia] analizarCv", error);
      return { ok: false, mensaje: "No pudimos analizar la hoja de vida con la IA. Intenta de nuevo en unos minutos." };
    }
    const { error } = await admin
      .from("evaluaciones_ia")
      .insert({ postulacion_id: postulacion.id, tarea: "leer_cv", resultado: cv, ajuste_total: null, modelo: modeloCv });
    if (error) {
      console.error("[ia] guardar leer_cv", error);
      return { ok: false, mensaje: "No pudimos guardar el análisis de la hoja de vida." };
    }

    // Con sospecha de manipulación el veredicto ya viene "por_revisar": nada se mueve solo.
    if (cv.sospecha) {
      hechos.push("Hoja de vida analizada: posible intento de manipular la lectura. Queda por revisar a mano.");
    } else if (cv.veredicto === "por_revisar") {
      hechos.push("Hoja de vida analizada: falta información para algún requisito, queda por revisar.");
    } else {
      const { data: cambio, error: errorCambio } = await admin.rpc("registrar_revision_cv", {
        p_postulacion: postulacion.id,
        p_cumple: cv.veredicto === "cumple",
      });
      if (errorCambio) console.error("[ia] registrar_revision_cv", errorCambio);
      if (cambio === "descartada") {
        revalidatePath(`/gestion/${vacanteId}`, "layout");
        return { ok: true, mensaje: "Hoja de vida analizada: no cumple un requisito mínimo y quedó descartada." };
      }
      hechos.push(
        cambio === "avanza"
          ? "Hoja de vida analizada: cumple los requisitos mínimos y pasó a la siguiente etapa."
          : "Hoja de vida analizada: cumple los requisitos mínimos.",
      );
    }
  }

  // 2. Rúbrica: solo si hay respuestas nuevas. Si la vacante nunca abrió la pestaña Rúbrica,
  // se crea la de por defecto (lo mismo que hace esa pestaña al abrirse).
  await sembrarRubricaSiFalta(vacante.id);
  const anterior = previas?.find((e) => e.tarea === "puntuar_rubrica")?.resultado as ResultadoRubrica | undefined;
  try {
    const r = await puntuarRespuestas(supabase, vacante, postulacion.id, anterior);
    if (r.tipo === "sin-respuestas") hechos.push("Todavía no hay respuestas para puntuar.");
    else if (r.tipo === "sin-cambios") hechos.push("No hay respuestas nuevas desde la última evaluación.");
    else if (r.tipo === "sin-rubrica") hechos.push("La vacante no tiene criterios en la rúbrica: no se puntuó.");
    else if (r.tipo === "nueva") {
      const { error } = await admin.from("evaluaciones_ia").upsert(
        {
          postulacion_id: postulacion.id,
          tarea: "puntuar_rubrica",
          resultado: r.resultado,
          ajuste_total: r.ajuste,
          modelo: r.modelo,
          created_at: new Date().toISOString(),
        },
        { onConflict: "postulacion_id,tarea" },
      );
      if (error) {
        console.error("[ia] guardar puntuar_rubrica", error);
        return { ok: false, mensaje: "No pudimos guardar la evaluación de las respuestas." };
      }
      hechos.push(`Puntuadas con la rúbrica: ${r.etapasNuevas.join(", ")}.`);
      if (r.resultado.etapas.some((e) => e.sospecha)) {
        hechos.push("Atención: posible intento de manipular la evaluación. Revisa las respuestas a mano.");
      }
    }
  } catch (error) {
    console.error("[ia] puntuarRespuestas", error);
    hechos.push("No pudimos puntuar las respuestas con la IA. Intenta de nuevo en unos minutos.");
    revalidatePath(`/gestion/${vacanteId}`, "layout");
    return { ok: false, mensaje: hechos.join(" ") };
  }

  revalidatePath(`/gestion/${vacanteId}`, "layout");
  return { ok: true, mensaje: hechos.join(" ") };
}

// Junta los requisitos y el archivo; la lectura con la IA está en calificacion-ia.ts.
async function analizarCv(
  supabase: Cliente,
  vacante: { id: string; cargo: string },
  cvPath: string,
): Promise<{ cv: ResultadoCv; modelo: string }> {
  const { data: filas, error } = await supabase
    .from("requisitos_oferta")
    .select("descripcion, valor_oferta, requisitos_minimos(valor_minimo)")
    .eq("vacante_id", vacante.id)
    .returns<
      {
        descripcion: string;
        valor_oferta: string;
        requisitos_minimos: { valor_minimo: string } | { valor_minimo: string }[] | null;
      }[]
    >();
  if (error) throw new Error(`No se pudieron leer los requisitos: ${error.message}`);

  // Solo descartan los requisitos que tienen un mínimo escrito.
  const requisitos = (filas ?? [])
    .map((r) => {
      const m = Array.isArray(r.requisitos_minimos) ? r.requisitos_minimos[0] : r.requisitos_minimos;
      return { oferta: (r.descripcion || r.valor_oferta || "").trim(), minimo: (m?.valor_minimo ?? "").trim() };
    })
    .filter((r) => r.minimo);

  // El CV está en un bucket privado: lo baja el servidor y va directo a Gemini.
  const { data: archivo, error: errorArchivo } = await crearClienteAdmin().storage.from("cvs").download(cvPath);
  if (errorArchivo || !archivo) throw new Error(`No se pudo descargar el CV: ${errorArchivo?.message}`);
  return revisarCv(vacante.cargo, requisitos, new Uint8Array(await archivo.arrayBuffer()));
}

type Puntuacion =
  | { tipo: "sin-respuestas" | "sin-cambios" | "sin-rubrica" }
  | { tipo: "nueva"; resultado: ResultadoRubrica; ajuste: number | null; modelo: string; etapasNuevas: string[] };

// Puntúa cada etapa de preguntas por separado (texto, voz…), para comparar las rondas.
// Solo llama a la IA por las etapas con respuestas nuevas: las demás conservan su puntaje.
async function puntuarRespuestas(
  supabase: Cliente,
  vacante: { id: string; cargo: string; descripcion: string | null },
  postulacionId: string,
  anterior: ResultadoRubrica | undefined,
): Promise<Puntuacion> {
  const [{ data: respuestas }, { data: preguntas }, { data: etapas }, { data: rubrica }] = await Promise.all([
    supabase
      .from("respuestas")
      .select("pregunta_id, texto, transcripcion")
      .eq("postulacion_id", postulacionId)
      .returns<{ pregunta_id: string; texto: string | null; transcripcion: string | null }[]>(),
    supabase
      .from("preguntas")
      .select("id, texto, orden, etapa_id")
      .eq("vacante_id", vacante.id)
      .returns<{ id: string; texto: string; orden: number; etapa_id: string }[]>(),
    supabase
      .from("vacante_etapas")
      .select("id, tipo, orden, nombre")
      .eq("vacante_id", vacante.id)
      .returns<{ id: string; tipo: keyof typeof NOMBRE_ETAPA; orden: number; nombre: string | null }[]>(),
    supabase.from("rubricas").select("id").eq("vacante_id", vacante.id).maybeSingle<{ id: string }>(),
  ]);
  if (!respuestas?.length) return { tipo: "sin-respuestas" };
  // Una evaluación del formato anterior (un solo puntaje, sin etapas) se rehace completa.
  const previa = Array.isArray(anterior?.etapas) ? anterior : undefined;
  const vigente = (e: EvaluacionEtapa) => e.version === VERSION_PUNTAJE;
  if (previa && previa.respuestasEvaluadas === respuestas.length && previa.etapas.every(vigente)) return { tipo: "sin-cambios" };

  const { data: criterios } = rubrica
    ? await supabase
        .from("criterios")
        .select("nombre, descripcion, peso")
        .eq("rubrica_id", rubrica.id)
        .order("created_at")
        .returns<Criterio[]>()
    : { data: [] as Criterio[] };
  if (!criterios?.length) return { tipo: "sin-rubrica" };

  // Preguntas numeradas igual que en el detalle del postulante (etapa por etapa), para que
  // la evidencia "Pregunta N" coincida con lo que ve gestión humana.
  const etapasPreguntas = (etapas ?? []).filter((e) => e.tipo === "texto" || e.tipo === "voz").sort((a, b) => a.orden - b.orden);
  const respuestaDe = new Map(respuestas.map((r) => [r.pregunta_id, r]));
  let numero = 0;
  const grupos = etapasPreguntas.map((e) => ({
    etapa: e,
    respondidas: (preguntas ?? [])
      .filter((p) => p.etapa_id === e.id)
      .sort((a, b) => a.orden - b.orden)
      .map((p) => {
        numero++;
        const r = respuestaDe.get(p.id);
        return r ? { numero, pregunta: p.texto, respuesta: (r.transcripcion ?? r.texto ?? "").trim() || "(vacía)" } : null;
      })
      .filter((x): x is Numerada => x !== null),
  }));

  const anteriores = new Map((previa?.etapas ?? []).map((e) => [e.etapaId, e]));
  const resultado: EvaluacionEtapa[] = [];
  const etapasNuevas: string[] = [];
  let modeloUsado = "";
  for (const { etapa, respondidas } of grupos) {
    if (!respondidas.length) continue;
    const nombre = etapa.nombre?.trim() || NOMBRE_ETAPA[etapa.tipo];
    const conservada = anteriores.get(etapa.id);
    if (conservada && conservada.respuestasEvaluadas === respondidas.length && vigente(conservada)) {
      resultado.push(conservada);
      continue;
    }
    const { evaluacion, modelo } = await puntuarEtapa(vacante, criterios, nombre, respondidas);
    resultado.push({ ...evaluacion, etapaId: etapa.id, nombre });
    etapasNuevas.push(nombre);
    modeloUsado = modelo;
  }

  // Total: promedio de las etapas con puntaje (cada ronda pesa igual).
  const conAjuste = resultado.filter((e) => e.ajuste != null);
  const ajuste = conAjuste.length ? Math.round(conAjuste.reduce((s, e) => s + e.ajuste!, 0) / conAjuste.length) : null;

  return {
    tipo: "nueva",
    modelo: modeloUsado,
    ajuste,
    etapasNuevas,
    resultado: { etapas: resultado, respuestasEvaluadas: respuestas.length },
  };
}
