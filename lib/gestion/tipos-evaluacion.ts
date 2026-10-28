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

// Tarea puntuar_rubrica: puntaje por criterio con evidencia. puntaje null = sin evidencia.
export type ResultadoRubrica = {
  criterios: { nombre: string; peso: number; puntaje: number | null; evidencia: string }[];
  fortalezas: string;
  profundizar: string;
  respuestasEvaluadas: number;
};
