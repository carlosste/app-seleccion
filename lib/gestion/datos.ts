import "server-only";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { Decision } from "@/lib/datos-prueba";

// Datos del panel de gestión. Cada función:
// 1) exige una sesión de empresa (requerirEmpresa),
// 2) consulta con el cliente del usuario, así RLS filtra por empresa,
// 3) además filtra por empresa_id de forma explícita (defensa en profundidad).

type TipoEtapa = "cv" | "texto" | "voz" | "entrevista";
type Etapa = { id: string; tipo: TipoEtapa; orden: number };

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
    .select("id, cargo, estado, enlace_token, postulaciones(count)")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle<{ id: string; cargo: string; estado: string; enlace_token: string; postulaciones: { count: number }[] }>();
  if (!data) return null;
  return {
    id: data.id,
    cargo: data.cargo,
    estado: data.estado,
    enlaceToken: data.enlace_token,
    total: data.postulaciones[0]?.count ?? 0,
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
      .select("id, numero_anonimo, etapa_actual_id")
      .eq("vacante_id", vacante.id)
      .returns<{ id: string; numero_anonimo: number; etapa_actual_id: string | null }[]>(),
    supabase.from("vacante_etapas").select("id, tipo, orden").eq("vacante_id", vacante.id).returns<Etapa[]>(),
  ]);
  if (!filas?.length) return [];

  const ids = filas.map((f) => f.id);
  const [{ data: evaluaciones }, { data: decisiones }] = await Promise.all([
    supabase
      .from("evaluaciones_ia")
      .select("postulacion_id, ajuste_total")
      .eq("tarea", "puntuar_rubrica")
      .in("postulacion_id", ids)
      .returns<{ postulacion_id: string; ajuste_total: number | null }[]>(),
    supabase
      .from("decisiones")
      .select("postulacion_id, resultado, created_at")
      .in("postulacion_id", ids)
      .order("created_at", { ascending: false })
      .returns<{ postulacion_id: string; resultado: "pasa" | "no_pasa" }[]>(),
  ]);

  const nombreEtapa = new Map((etapas ?? []).map((e) => [e.id, NOMBRE_ETAPA[e.tipo]]));
  const ajuste = new Map((evaluaciones ?? []).map((e) => [e.postulacion_id, e.ajuste_total]));
  const ultimaDecision = new Map<string, "pasa" | "no_pasa">();
  for (const d of decisiones ?? []) if (!ultimaDecision.has(d.postulacion_id)) ultimaDecision.set(d.postulacion_id, d.resultado);

  return filas
    .map((f) => {
      const d = ultimaDecision.get(f.id);
      return {
        id: f.id,
        numero: formatoNumero(f.numero_anonimo),
        etapa: (f.etapa_actual_id && nombreEtapa.get(f.etapa_actual_id)) || "Por revisar",
        ajuste: ajuste.get(f.id) == null ? null : Math.round(Number(ajuste.get(f.id))),
        decision: (d === "pasa" ? "pasa" : d === "no_pasa" ? "no" : "pendiente") as Decision,
      };
    })
    .sort((a, b) => (b.ajuste ?? -1) - (a.ajuste ?? -1));
}

export async function obtenerPostulante(vacanteId: string, numero: string) {
  if (!/^\d{1,6}$/.test(numero)) return null;
  const vacante = await obtenerVacante(vacanteId);
  if (!vacante) return null;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("v_postulaciones_staff")
    .select("id, numero_anonimo, nombre_revelado_at, nombre")
    .eq("vacante_id", vacante.id)
    .eq("numero_anonimo", Number(numero))
    .maybeSingle<{ id: string; numero_anonimo: number; nombre_revelado_at: string | null; nombre: string | null }>();
  if (!data) return null;

  // Solo se informa si hay CV; la ruta del archivo nunca sale al navegador.
  const { data: cv } = await supabase
    .from("postulaciones")
    .select("cv_path")
    .eq("id", data.id)
    .maybeSingle<{ cv_path: string | null }>();

  return {
    vacante,
    id: data.id,
    numero: formatoNumero(data.numero_anonimo),
    revelado: Boolean(data.nombre_revelado_at),
    nombre: data.nombre,
    tieneCv: Boolean(cv?.cv_path),
  };
}
