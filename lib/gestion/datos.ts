import "server-only";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Decision } from "@/lib/datos-prueba";
import type { EvaluacionEtapa, ResultadoCv, ResultadoRubrica } from "./tipos-evaluacion";

// Datos del panel de gestión. Cada función:
// 1) exige una sesión de empresa (requerirEmpresa),
// 2) consulta con el cliente del usuario, así RLS filtra por empresa,
// 3) además filtra por empresa_id de forma explícita (defensa en profundidad).

type TipoEtapa = "cv" | "texto" | "voz" | "entrevista";
type Etapa = { id: string; tipo: TipoEtapa; orden: number; nombre?: string | null };

export const NOMBRE_ETAPA: Record<TipoEtapa, string> = {
  cv: "Revisión de CV",
  texto: "Preguntas por texto",
  voz: "Preguntas por voz",
  entrevista: "Entrevista",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v: string) => UUID.test(v);

export type VacanteResumen = {
  id: string;
  cargo: string;
  estado: "borrador" | "abierta" | "cerrada";
  enlaceToken: string;
  postulados: number;
  alcanzaron: Record<"texto" | "voz" | "entrevista", number>;
};

export async function listarVacantes(): Promise<VacanteResumen[]> {
  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();

  const { data: vacantes, error } = await supabase
    .from("vacantes")
    .select("id, cargo, estado, enlace_token, vacante_etapas(id, tipo, orden)")
    .eq("empresa_id", empresa.id)
    .neq("estado", "cerrada")
    .order("created_at", { ascending: false })
    .returns<{ id: string; cargo: string; estado: VacanteResumen["estado"]; enlace_token: string; vacante_etapas: Etapa[] }[]>();
  if (error) throw new Error(`No se pudieron leer las vacantes: ${error.message}`);
  if (!vacantes.length) return [];

  const { data: postulaciones, error: e2 } = await supabase
    .from("postulaciones")
    .select("vacante_id, etapa_actual_id")
    .in("vacante_id", vacantes.map((v) => v.id))
    .returns<{ vacante_id: string; etapa_actual_id: string | null }[]>();
  if (e2) throw new Error(`No se pudieron leer las postulaciones: ${e2.message}`);

  return vacantes.map((v) => {
    const ordenPorEtapa = new Map(v.vacante_etapas.map((e) => [e.id, e.orden]));
    const propias = postulaciones.filter((p) => p.vacante_id === v.id);
    // Cuántos postulantes llegaron (al menos) a cada etapa.
    const alcanzo = (tipo: TipoEtapa) => {
      const etapa = v.vacante_etapas.find((e) => e.tipo === tipo);
      if (!etapa) return 0;
      return propias.filter((p) => (p.etapa_actual_id ? ordenPorEtapa.get(p.etapa_actual_id) ?? 0 : 0) >= etapa.orden).length;
    };
    return {
      id: v.id,
      cargo: v.cargo,
      estado: v.estado,
      enlaceToken: v.enlace_token,
      postulados: propias.length,
      alcanzaron: { texto: alcanzo("texto"), voz: alcanzo("voz"), entrevista: alcanzo("entrevista") },
    };
  });
}

export async function obtenerVacante(id: string) {
  if (!esUuid(id)) return null;
  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("vacantes")
    .select("id, cargo, descripcion, estado, enlace_token")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle<{ id: string; cargo: string; descripcion: string | null; estado: string; enlace_token: string }>();
  if (!data) return null;
  // Conteo directo, con la misma tabla y el mismo filtro que la lista de postulantes.
  const { count } = await supabase
    .from("postulaciones")
    .select("id", { count: "exact", head: true })
    .eq("vacante_id", data.id);
  return {
    id: data.id,
    cargo: data.cargo,
    descripcion: data.descripcion ?? "",
    estado: data.estado,
    enlaceToken: data.enlace_token,
    total: count ?? 0,
  };
}

export type PostulanteFila = {
  id: string;
  numero: string; // "014"
  etapa: string;
  ajuste: number | null;
  decision: Decision;
};

export const formatoNumero = (n: number) => String(n).padStart(3, "0");

export async function listarPostulantes(vacanteId: string): Promise<PostulanteFila[]> {
  const vacante = await obtenerVacante(vacanteId);
  if (!vacante) return [];
  const supabase = await crearClienteServidor();

  // Vista a ciegas: nombre, correo y teléfono vienen en null hasta revelar.
  const [{ data: filas }, { data: etapas }] = await Promise.all([
    supabase
      .from("v_postulaciones_staff")
      .select("id, numero_anonimo, etapa_actual_id, estado")
      .eq("vacante_id", vacante.id)
      .returns<{ id: string; numero_anonimo: number; etapa_actual_id: string | null; estado: EstadoPostulacion }[]>(),
    supabase.from("vacante_etapas").select("id, tipo, orden, nombre").eq("vacante_id", vacante.id).returns<Etapa[]>(),
  ]);
  if (!filas?.length) return [];

  const ids = filas.map((f) => f.id);
  const { data: evaluaciones } = await supabase
    .from("evaluaciones_ia")
    .select("postulacion_id, tarea, ajuste_total, resultado")
    .in("postulacion_id", ids)
    .returns<{ postulacion_id: string; tarea: string; ajuste_total: number | null; resultado: unknown }[]>();

  // El nombre que le puso la empresa; si no tiene, el del tipo de etapa.
  const etapaPorId = new Map((etapas ?? []).map((e) => [e.id, e]));
  const ajuste = new Map<string, number | null>();
  const porRevisar = new Set<string>();
  for (const e of evaluaciones ?? []) {
    if (e.tarea === "puntuar_rubrica") ajuste.set(e.postulacion_id, e.ajuste_total);
    if (e.tarea === "leer_cv" && (e.resultado as ResultadoCv).veredicto === "por_revisar") porRevisar.add(e.postulacion_id);
  }

  return filas
    .map((f) => {
      const etapa = f.etapa_actual_id ? etapaPorId.get(f.etapa_actual_id) : undefined;
      const nombre = etapa ? etapa.nombre?.trim() || NOMBRE_ETAPA[etapa.tipo] : "Sin etapa";
      const valor = ajuste.get(f.id);
      return {
        id: f.id,
        numero: formatoNumero(f.numero_anonimo),
        etapa: f.estado === "en_proceso" && porRevisar.has(f.id) ? `${nombre} · CV por revisar` : nombre,
        ajuste: valor == null ? null : Math.round(Number(valor)),
        decision: DECISION_POR_ESTADO[f.estado],
      };
    })
    .sort((a, b) => (b.ajuste ?? -1) - (a.ajuste ?? -1));
}

type EstadoPostulacion = "en_proceso" | "descartada" | "seleccionada";

// Cada "Pasa" mueve a la siguiente etapa, así que mientras siga en proceso la etapa actual
// está pendiente de decisión. "Pasa" en la lista es haber superado la última etapa.
const DECISION_POR_ESTADO: Record<EstadoPostulacion, Decision> = {
  en_proceso: "pendiente",
  descartada: "no",
  seleccionada: "pasa",
};

// Hasta qué etapa llegó el postulante. Igual que orden_alcanzado en la base: si está en la
// revisión de CV, ya responde la siguiente etapa de preguntas.
function ordenAlcanzado(etapas: Etapa[], actual: Etapa | undefined): number {
  if (!actual) return 0;
  if (actual.tipo !== "cv") return actual.orden;
  const siguiente = etapas
    .filter((e) => e.orden > actual.orden && (e.tipo === "texto" || e.tipo === "voz"))
    .sort((a, b) => a.orden - b.orden)[0];
  return siguiente?.orden ?? actual.orden;
}

export async function obtenerPostulante(vacanteId: string, numero: string) {
  if (!/^\d{1,6}$/.test(numero)) return null;
  const vacante = await obtenerVacante(vacanteId);
  if (!vacante) return null;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("v_postulaciones_staff")
    .select("id, numero_anonimo, nombre_revelado_at, nombre, etapa_actual_id, estado")
    .eq("vacante_id", vacante.id)
    .eq("numero_anonimo", Number(numero))
    .maybeSingle<{
      id: string;
      numero_anonimo: number;
      nombre_revelado_at: string | null;
      nombre: string | null;
      etapa_actual_id: string | null;
      estado: EstadoPostulacion;
    }>();
  if (!data) return null;

  // Solo se informa si hay CV; la ruta del archivo nunca sale al navegador.
  const [{ data: cv }, { data: etapasDatos }, { data: preguntas }, { data: respuestas }, { data: evaluaciones }, { data: decisiones }] =
    await Promise.all([
      supabase.from("postulaciones").select("cv_path").eq("id", data.id).maybeSingle<{ cv_path: string | null }>(),
      supabase.from("vacante_etapas").select("id, tipo, orden, nombre").eq("vacante_id", vacante.id).order("orden").returns<Etapa[]>(),
      supabase
        .from("preguntas")
        .select("id, etapa_id, texto, orden")
        .eq("vacante_id", vacante.id)
        .order("orden")
        .returns<{ id: string; etapa_id: string; texto: string; orden: number }[]>(),
      supabase
        .from("respuestas")
        .select("pregunta_id, texto, transcripcion, respondida_at")
        .eq("postulacion_id", data.id)
        .returns<{ pregunta_id: string; texto: string | null; transcripcion: string | null; respondida_at: string }[]>(),
      supabase
        .from("evaluaciones_ia")
        .select("tarea, resultado, ajuste_total, created_at")
        .eq("postulacion_id", data.id)
        .returns<{ tarea: string; resultado: unknown; ajuste_total: number | null; created_at: string }[]>(),
      supabase
        .from("decisiones")
        .select("resultado, motivo, etapa_id, usuario_id, created_at")
        .eq("postulacion_id", data.id)
        .order("created_at", { ascending: false })
        .returns<{ resultado: "pasa" | "no_pasa"; motivo: string | null; etapa_id: string | null; usuario_id: string | null; created_at: string }[]>(),
    ]);

  const etapas = etapasDatos ?? [];
  const nombreDe = (e: Etapa) => e.nombre?.trim() || NOMBRE_ETAPA[e.tipo];
  const actual = etapas.find((e) => e.id === data.etapa_actual_id);
  const siguiente = actual ? etapas.find((e) => e.orden > actual.orden) : etapas[0];
  const alcanzado = ordenAlcanzado(etapas, actual);

  // Respuestas agrupadas por etapa de preguntas (texto o voz), con las que faltan.
  const respuestaDe = new Map((respuestas ?? []).map((r) => [r.pregunta_id, r]));
  let contador = 0;
  const grupos: GrupoRespuestas[] = etapas
    .filter((e) => e.tipo === "texto" || e.tipo === "voz")
    .map((e) => ({
      etapaId: e.id,
      tipo: e.tipo as "texto" | "voz",
      nombre: nombreDe(e),
      alcanzada: e.orden <= alcanzado,
      preguntas: (preguntas ?? [])
        .filter((p) => p.etapa_id === e.id)
        .map((p) => {
          const r = respuestaDe.get(p.id);
          return {
            numero: ++contador,
            pregunta: p.texto,
            respuesta: r ? (r.transcripcion ?? r.texto ?? "").trim() : null,
            respondidaAt: r?.respondida_at ?? null,
          };
        }),
    }));

  const leerCv = evaluaciones?.find((e) => e.tarea === "leer_cv");
  const rubrica = evaluaciones?.find((e) => e.tarea === "puntuar_rubrica");
  const etapaPorId = new Map(etapas.map((e) => [e.id, e]));

  return {
    vacante,
    id: data.id,
    numero: formatoNumero(data.numero_anonimo),
    revelado: Boolean(data.nombre_revelado_at),
    nombre: data.nombre,
    tieneCv: Boolean(cv?.cv_path),
    estado: data.estado,
    etapaActual: actual ? nombreDe(actual) : null,
    // Lo que pasa al decidir "Pasa": otra etapa o, si era la última, quedar seleccionado.
    siguienteEtapa: siguiente ? nombreDe(siguiente) : null,
    grupos,
    totalRespuestas: respuestas?.length ?? 0,
    cv: leerCv ? { ...(leerCv.resultado as ResultadoCv), fecha: leerCv.created_at } : null,
    rubrica: rubrica ? normalizarRubrica(rubrica.resultado, rubrica.ajuste_total, rubrica.created_at) : null,
    decisiones: (decisiones ?? []).map((d) => {
      const e = d.etapa_id ? etapaPorId.get(d.etapa_id) : undefined;
      return {
        resultado: d.resultado,
        // Sin usuario = la tomó el sistema por requisitos mínimos (revisión de CV con IA).
        automatica: d.usuario_id == null,
        motivo: d.motivo === "requisito_minimo" ? null : d.motivo,
        etapa: e ? nombreDe(e) : "Etapa borrada",
        fecha: d.created_at,
      };
    }),
  };
}

// Antes del 2026-10-28 la rúbrica daba un solo puntaje para todas las respuestas. Esas
// evaluaciones se muestran como una sola sección hasta que se vuelvan a evaluar por etapa.
function normalizarRubrica(resultado: unknown, ajusteTotal: number | null, fecha: string) {
  const ajuste = ajusteTotal == null ? null : Math.round(Number(ajusteTotal));
  const r = resultado as Partial<ResultadoRubrica> & {
    criterios?: EvaluacionEtapa["criterios"];
    fortalezas?: string;
    profundizar?: string;
  };
  if (Array.isArray(r.etapas)) return { etapas: r.etapas, respuestasEvaluadas: r.respuestasEvaluadas ?? 0, ajuste, fecha, anterior: false };
  return {
    etapas: [
      {
        etapaId: "anterior",
        nombre: "Todas las respuestas",
        ajuste,
        criterios: r.criterios ?? [],
        fortalezas: r.fortalezas ?? "",
        profundizar: r.profundizar ?? "",
        respuestasEvaluadas: r.respuestasEvaluadas ?? 0,
        fecha,
      },
    ],
    respuestasEvaluadas: r.respuestasEvaluadas ?? 0,
    ajuste,
    fecha,
    anterior: true,
  };
}

export type GrupoRespuestas = {
  etapaId: string;
  tipo: "texto" | "voz";
  nombre: string;
  alcanzada: boolean;
  preguntas: { numero: number; pregunta: string; respuesta: string | null; respondidaAt: string | null }[];
};
