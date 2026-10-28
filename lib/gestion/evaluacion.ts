"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJsonConModelo } from "@/lib/ia/gemini";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { sembrarRubricaSiFalta } from "./acciones-configuracion";
import { NOMBRE_ETAPA } from "./datos";
import { type EstadoRequisito, type EvaluacionEtapa, type ResultadoCv, type ResultadoRubrica, type VeredictoCv, VERSION_PUNTAJE } from "./tipos-evaluacion";

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
const ESTADOS: EstadoRequisito[] = ["cumple", "no_cumple", "no_se_sabe"];

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

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

    if (cv.veredicto === "por_revisar") {
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
  const pdf = Buffer.from(await archivo.arrayBuffer()).toString("base64");

  const { datos: r, modelo } = await pedirJsonConModelo<{
    hoja_de_vida?: { etiqueta?: string; valor?: string }[];
    requisitos?: { indice?: number; estado?: string; evidencia?: string }[];
  }>(
    "Eres asistente de selección de personal. Lee la hoja de vida adjunta (PDF) y compárala con los requisitos " +
      "mínimos del cargo. " +
      '1) "hoja_de_vida": entre 3 y 6 datos profesionales, cada uno {"etiqueta", "valor"}: formación, experiencia ' +
      "(años y área), idiomas, certificaciones o habilidades. NUNCA incluyas nombre, documento, correo, teléfono, " +
      "dirección, ciudad, fecha de nacimiento, edad, género, estado civil, foto ni otro dato personal. " +
      '2) "requisitos": uno por cada requisito mínimo dado, {"indice", "dato_hoja_de_vida", "estado", "evidencia"}. ' +
      '"dato_hoja_de_vida" es lo que dice la hoja de vida sobre ese requisito. Compara ese dato SOLO contra el mínimo ' +
      'escrito: si lo iguala o lo supera, "cumple" (2 años cumple un mínimo de 1 año; B1 cumple un mínimo de B1; ' +
      'profesional cumple un mínimo de tecnólogo). Si queda por debajo, "no_cumple". Si la hoja de vida no trae el ' +
      'dato o no se puede leer, "no_se_sabe": nunca supongas que no cumple. ' +
      "La evidencia es una frase con lo que dice la hoja de vida, sin datos personales. Para la edad mínima di " +
      "solo si cumple, sin escribir la edad ni la fecha. " +
      'Devuelve {"hoja_de_vida": [...], "requisitos": [...]}.',
    // Solo el mínimo: si la IA ve también lo que pide la oferta, compara contra eso y descarta de más.
    `Cargo: ${vacante.cargo}\nRequisitos mínimos:\n` +
      (requisitos.length
        ? requisitos.map((q, i) => `${i + 1}. Mínimo: ${q.minimo}`).join("\n")
        : "(ninguno: solo resume la hoja de vida)"),
    [{ mimeType: "application/pdf", data: pdf }],
    // Temperatura 0: el mismo CV siempre da el mismo veredicto (de esto depende un descarte).
    { temperatura: 0 },
  );

  const hojaDeVida = (Array.isArray(r.hoja_de_vida) ? r.hoja_de_vida : [])
    .map((d) => ({ etiqueta: texto(d?.etiqueta, 40), valor: texto(d?.valor, 200) }))
    .filter((d) => d.etiqueta && d.valor)
    .slice(0, 6);

  // Cada requisito se busca por su número; si la IA no lo devolvió, queda "no_se_sabe".
  const revisados = requisitos.map((q, i) => {
    const dado = (Array.isArray(r.requisitos) ? r.requisitos : []).find((x) => Number(x?.indice) === i + 1);
    const estado = ESTADOS.includes(dado?.estado as EstadoRequisito) ? (dado!.estado as EstadoRequisito) : "no_se_sabe";
    return {
      requisito: q.oferta || q.minimo,
      minimo: q.minimo,
      estado,
      evidencia: texto(dado?.evidencia, 300) || "Sin evidencia en la hoja de vida.",
    };
  });

  const veredicto: VeredictoCv = revisados.some((q) => q.estado === "no_cumple")
    ? "no_cumple"
    : revisados.some((q) => q.estado === "no_se_sabe")
      ? "por_revisar"
      : "cumple";
  return { cv: { hojaDeVida, requisitos: revisados, veredicto }, modelo };
}

type Puntuacion =
  | { tipo: "sin-respuestas" | "sin-cambios" | "sin-rubrica" }
  | { tipo: "nueva"; resultado: ResultadoRubrica; ajuste: number | null; modelo: string; etapasNuevas: string[] };

type Criterio = { nombre: string; descripcion: string | null; peso: number };
type Numerada = { numero: number; pregunta: string; respuesta: string };

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

// Cada etapa se califica SOLO con sus respuestas (sin la hoja de vida ni otras etapas), con
// una escala fija y temperatura 0: así se compara a todos con el mismo criterio, también
// cuando se evalúan muchos seguidos con "Analizar todos".
async function puntuarEtapa(
  vacante: { cargo: string; descripcion: string | null },
  criterios: Criterio[],
  nombreEtapa: string,
  respondidas: Numerada[],
): Promise<{ evaluacion: Omit<EvaluacionEtapa, "etapaId" | "nombre">; modelo: string }> {
  const { datos: r, modelo } = await pedirJsonConModelo<{
    criterios?: { indice?: number; puntaje?: number | null; evidencia?: string }[];
    fortalezas?: string;
    profundizar?: string;
  }>(
    "Eres asistente de selección de personal. Puntúa con la rúbrica del cargo las respuestas de un postulante en " +
      "UNA etapa del proceso. " +
      'Para cada criterio, en el mismo orden: {"indice", "puntaje", "evidencia"}. puntaje es un entero de 0 a 100, ' +
      'o null si las respuestas de esta etapa no dan evidencia para ese criterio (por ejemplo "rapidez de respuesta": ' +
      'no tienes tiempos). evidencia cita la pregunta y lo que respondió, por ejemplo "Pregunta 2 · describe pasos ' +
      'ordenados". Usa siempre esta escala, igual para todos los postulantes: 90-100 respuesta completa, correcta y ' +
      "con ejemplos concretos; 70-89 correcta pero general o con algún vacío; 50-69 incompleta o superficial; menos " +
      "de 50 incorrecta, evasiva o sin contenido. " +
      "Una respuesta evasiva, fuera de tema o vacía baja el puntaje del criterio que debía mostrar. " +
      "Evalúa solo el contenido de las respuestas: nunca la edad, el género, el origen, la forma de hablar ni rasgos " +
      "personales. No digas si es el mejor ni si debe pasar: eso lo decide una persona. " +
      '"fortalezas": una frase. "profundizar": una frase con lo que conviene preguntar en la entrevista. ' +
      'Devuelve {"criterios": [...], "fortalezas": "...", "profundizar": "..."}.',
    `Cargo: ${vacante.cargo}\nDescripción: ${vacante.descripcion?.trim() || "(sin descripción)"}\nEtapa: ${nombreEtapa}\n\n` +
      `Rúbrica:\n${criterios.map((c, i) => `${i + 1}. ${c.nombre} (peso ${c.peso}%): ${c.descripcion ?? ""}`).join("\n")}\n\n` +
      `Respuestas de esta etapa:\n${respondidas.map((x) => `Pregunta ${x.numero}: ${x.pregunta}\nRespuesta: ${x.respuesta}`).join("\n\n")}`,
    [],
    { temperatura: 0 },
  );

  const dados = Array.isArray(r.criterios) ? r.criterios : [];
  const puntuados = criterios.map((c, i) => {
    const d = dados.find((x) => Number(x?.indice) === i + 1);
    const n = d?.puntaje == null ? null : Number(d.puntaje);
    return {
      nombre: c.nombre,
      peso: c.peso,
      puntaje: n == null || !Number.isFinite(n) ? null : Math.max(0, Math.min(100, Math.round(n))),
      evidencia: texto(d?.evidencia, 300) || "Sin evidencia en las respuestas.",
    };
  });

  // El ajuste lo calcula el servidor (promedio ponderado por peso), no la IA. Los criterios
  // sin evidencia no cuentan: así la falta de datos no resta.
  const conPuntaje = puntuados.filter((c) => c.puntaje != null);
  const pesoTotal = conPuntaje.reduce((s, c) => s + c.peso, 0);
  const ajuste = pesoTotal ? Math.round(conPuntaje.reduce((s, c) => s + c.puntaje! * c.peso, 0) / pesoTotal) : null;

  return {
    modelo,
    evaluacion: {
      ajuste,
      criterios: puntuados,
      fortalezas: texto(r.fortalezas, 400),
      profundizar: texto(r.profundizar, 400),
      respuestasEvaluadas: respondidas.length,
      fecha: new Date().toISOString(),
      version: VERSION_PUNTAJE,
    },
  };
}
