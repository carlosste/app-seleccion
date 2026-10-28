// Forma del JSON que se guarda en evaluaciones_ia.resultado. Lo escribe el servidor
// (lib/gestion/evaluacion.ts) y lo leen las pantallas de gestión.

export type EstadoRequisito = "cumple" | "no_cumple" | "no_se_sabe";
export type VeredictoCv = "cumple" | "no_cumple" | "por_revisar";

// Tarea leer_cv: hoja de vida sin datos personales y revisión de requisitos mínimos.
export type ResultadoCv = {
  hojaDeVida: { etiqueta: string; valor: string }[];
  requisitos: { requisito: string; minimo: string; estado: EstadoRequisito; evidencia: string }[];
  veredicto: VeredictoCv;
};

export type CriterioPuntuado = { nombre: string; peso: number; puntaje: number | null; evidencia: string };

// Puntaje de una etapa de preguntas (texto o voz) con la rúbrica. puntaje null = sin evidencia.
export type EvaluacionEtapa = {
  etapaId: string;
  nombre: string;
  ajuste: number | null;
  criterios: CriterioPuntuado[];
  fortalezas: string;
  profundizar: string;
  respuestasEvaluadas: number;
  fecha: string;
};

// Tarea puntuar_rubrica: una evaluación por etapa (desde el 2026-10-28), así se compara cómo
// le fue en cada ronda. El total (ajuste_total de la fila) es el promedio de las etapas.
export type ResultadoRubrica = {
  etapas: EvaluacionEtapa[];
  respuestasEvaluadas: number;
};
