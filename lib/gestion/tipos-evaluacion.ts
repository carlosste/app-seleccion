// Forma del JSON que se guarda en evaluaciones_ia.resultado. Lo escribe el servidor
// (lib/gestion/evaluacion.ts) y lo leen las pantallas de gestión.

export type EstadoRequisito = "cumple" | "no_cumple" | "no_se_sabe";
export type VeredictoCv = "cumple" | "no_cumple" | "por_revisar";

// Tarea leer_cv: hoja de vida sin datos personales y revisión de requisitos mínimos.
export type ResultadoCv = {
  hojaDeVida: { etiqueta: string; valor: string }[];
  requisitos: { requisito: string; minimo: string; estado: EstadoRequisito; evidencia: string }[];
  veredicto: VeredictoCv;
  // Desde el 2026-11-16. Posible intento de manipular la lectura (texto oculto, instrucciones
  // para la IA). Con sospecha el veredicto queda "por_revisar" y decide una persona.
  sospecha?: boolean;
  motivoSospecha?: string;
};

// verificada (desde VERSION_PUNTAJE 3): la cita de la IA aparece en la respuesta. false = la
// evidencia no se encontró tal cual; revisar a mano.
// cita y pregunta (2026-11-16, rediseño del panel): el fragmento literal de la respuesta y su
// número de pregunta, guardados SOLO si la cita se verificó, para marcarlo en la respuesta.
// Opcionales: las evaluaciones anteriores no los tienen y se ven igual, sin marca.
export type CriterioPuntuado = {
  nombre: string;
  peso: number;
  puntaje: number | null;
  evidencia: string;
  verificada?: boolean;
  cita?: string;
  pregunta?: number;
};

// Sube cuando cambia cómo se califica (prompt, escala, temperatura). Una etapa evaluada con
// otra versión se vuelve a calificar, para que todos queden medidos con el mismo criterio.
// 2 (2026-10-28): solo respuestas de la etapa, escala fija y temperatura 0.
// 3 (2026-11-16): respuestas como datos no confiables, esquema de salida, cita verificada y
// aviso de posible manipulación.
export const VERSION_PUNTAJE = 3;

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
  version?: number;
  // Desde VERSION_PUNTAJE 3: la IA o el detector del servidor vieron un posible intento de
  // manipular la evaluación. El puntaje se guarda igual, pero una persona debe revisarlo.
  sospecha?: boolean;
  motivoSospecha?: string;
};

// Tarea analizar_entrevista (2026-11-19): la transcripción de la entrevista (Teams, Meet…)
// analizada con la rúbrica. Las citas se verifican contra lo que dijo el candidato; "turno" es
// el número de intervención en la transcripción. El ajuste cuenta en el total como una etapa más.
export type ResultadoEntrevista = {
  etapaId: string | null;
  ajuste: number | null;
  resumen: string;
  temas: string[];
  criterios: (CriterioPuntuado & { turno?: number })[];
  fortalezas: string[];
  debilidades: string[];
  profundizar: string;
  momentos: { turno: number; descripcion: string }[];
  turnosCandidato: number;
  palabrasCandidato: number;
  fecha: string;
  version: number;
  sospecha?: boolean;
  motivoSospecha?: string;
};

// Tarea puntuar_rubrica: una evaluación por etapa (desde el 2026-10-28), así se compara cómo
// le fue en cada ronda. El total (ajuste_total de la fila) es el promedio de las etapas.
export type ResultadoRubrica = {
  etapas: EvaluacionEtapa[];
  respuestasEvaluadas: number;
};
