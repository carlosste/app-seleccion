// Datos de prueba. No son reales y no hay base de datos todavía (Fase 2).
// Todas las vacantes usan los mismos requisitos, criterios y postulantes de ejemplo.

export const empresa = { nombre: "Empresa Demo S.A.S." };

export type Vacante = {
  id: string;
  cargo: string;
  chips: string[];
  vencimientoCodigo: string;
  postulados: number;
  textos: number;
  voz: number;
  entrevista: number;
};

export const vacantes: Vacante[] = [
  {
    id: "analista-soporte",
    cargo: "Analista de soporte técnico",
    chips: ["Tecnólogo", "3 años de experiencia", "Inglés B2"],
    vencimientoCodigo: "3 meses",
    postulados: 1240,
    textos: 310,
    voz: 85,
    entrevista: 12,
  },
  {
    id: "desarrollador-web-junior",
    cargo: "Desarrollador/a web junior",
    chips: ["Tecnólogo en sistemas", "1 año de experiencia", "Inglés B1"],
    vencimientoCodigo: "4 meses",
    postulados: 860,
    textos: 190,
    voz: 40,
    entrevista: 0,
  },
  {
    id: "auxiliar-administrativo",
    cargo: "Auxiliar administrativo/a",
    chips: ["Bachiller", "1 año de experiencia", "Excel intermedio"],
    vencimientoCodigo: "2 meses",
    postulados: 430,
    textos: 0,
    voz: 0,
    entrevista: 0,
  },
];

export function obtenerVacante(id: string): Vacante | undefined {
  return vacantes.find((v) => v.id === id);
}

export function porcentaje(parte: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parte / total) * 100);
}

export const etapas = [
  { titulo: "Revisión de CV", detalle: "Automática · requisitos mínimos" },
  { titulo: "Preguntas por texto", detalle: "Cuestionario · a ciegas" },
  { titulo: "Preguntas por voz", detalle: "Cuestionario · a ciegas" },
  { titulo: "Entrevista", detalle: "Con entrevistador · grabada" },
];

export type Requisito = { nombre: string; oferta: string; minimo: string };

export const requisitos: Requisito[] = [
  { nombre: "Formación", oferta: "Tecnólogo en sistemas o afines", minimo: "Técnico en sistemas" },
  { nombre: "Experiencia", oferta: "3 años en soporte", minimo: "1 año" },
  { nombre: "Idioma", oferta: "Inglés B2", minimo: "Inglés B1" },
  { nombre: "Edad mínima", oferta: "", minimo: "Mayor de 18 años" },
  { nombre: "Certificación", oferta: "CCNA (deseable)", minimo: "" },
];

export const sugeridos = [
  "Licencia de conducción",
  "Ciudad de residencia",
  "Disponibilidad de horario",
  "Manejo de software",
];

export type Criterio = {
  nombre: string;
  descripcion: string;
  peso: number;
  esencial: boolean;
};

export const criterios: Criterio[] = [
  {
    nombre: "Conocimiento técnico",
    descripcion: "Domina las herramientas y conceptos que pide el cargo.",
    peso: 35,
    esencial: true,
  },
  {
    nombre: "Resolución de problemas",
    descripcion: "Explica con orden cómo llegaría a una solución.",
    peso: 25,
    esencial: true,
  },
  {
    nombre: "Comunicación clara",
    descripcion: "Se entiende lo que quiere decir. Se evalúa el contenido, no el acento.",
    peso: 20,
    esencial: true,
  },
  {
    nombre: "Experiencia relacionada",
    descripcion: "Da ejemplos reales de trabajos o proyectos parecidos.",
    peso: 15,
    esencial: false,
  },
  {
    nombre: "Rapidez de respuesta",
    descripcion: "Suma un poco si responde ágil; responder despacio no resta.",
    peso: 5,
    esencial: false,
  },
];

export type Decision = "pasa" | "pendiente" | "no";

export const postulantes: { id: string; etapa: string; ajuste: number; decision: Decision }[] = [
  { id: "014", etapa: "Preguntas por voz", ajuste: 86, decision: "pasa" },
  { id: "237", etapa: "Preguntas por voz", ajuste: 81, decision: "pendiente" },
  { id: "102", etapa: "Preguntas por voz", ajuste: 77, decision: "pendiente" },
  { id: "058", etapa: "Preguntas por voz", ajuste: 72, decision: "pasa" },
  { id: "311", etapa: "Preguntas por voz", ajuste: 64, decision: "pendiente" },
  { id: "190", etapa: "Preguntas por voz", ajuste: 51, decision: "no" },
];

// Solo el candidato 014 tiene detalle de prueba completo.
export const candidatoDetalle = "014";

export const preguntasVoz = [
  "Cuéntanos de una vez que resolviste un problema técnico difícil. ¿Qué hiciste paso a paso?",
  "¿Cómo le explicas un problema técnico a alguien que no sabe de tecnología?",
  "¿Cómo diagnosticarías un equipo que no se conecta a la red?",
  "¿Qué herramientas de soporte remoto has usado y para qué?",
  "¿Qué harías si un usuario insiste en que su equipo está dañado y tú no lo ves así?",
];

export const respuestasEjemplo = [
  {
    pregunta: "¿Cómo diagnosticarías un equipo que no se conecta a la red?",
    duracion: "1:12",
    texto:
      "Primero revisaría el cable o el wifi, después la configuración IP con ipconfig, y probaría hacer ping al router para saber si el problema es del equipo o de la red…",
  },
  {
    pregunta: "Cuéntanos de una vez que resolviste un problema técnico difícil.",
    duracion: "1:48",
    texto:
      "En mi trabajo anterior varios usuarios no podían imprimir. Revisé la cola de impresión, encontré que el controlador se había actualizado mal y lo reinstalé en cada equipo…",
  },
  {
    pregunta: "¿Cómo le explicas un problema técnico a alguien que no sabe de tecnología?",
    duracion: "0:58",
    texto:
      "Uso ejemplos del día a día y evito palabras técnicas. Le digo qué pasó, qué voy a hacer y cuánto se puede demorar…",
  },
];

export const hojaVidaEjemplo = [
  { etiqueta: "Formación", valor: "Tecnólogo en sistemas" },
  { etiqueta: "Experiencia", valor: "2 años en soporte a usuarios" },
  { etiqueta: "Idioma", valor: "Inglés B1" },
];

export const evaluacionEjemplo = {
  ajuste: 86,
  criterios: [
    { nombre: "Conocimiento técnico", puntaje: 88, evidencia: "Pregunta 1 · nombra herramientas de diagnóstico correctas" },
    { nombre: "Resolución de problemas", puntaje: 90, evidencia: "Pregunta 2 · describe pasos ordenados" },
    { nombre: "Comunicación clara", puntaje: 84, evidencia: "Respuestas completas y fáciles de seguir" },
    { nombre: "Experiencia relacionada", puntaje: 78, evidencia: "Pregunta 3 · ejemplo de soporte a usuarios" },
    { nombre: "Rapidez de respuesta", puntaje: 80, evidencia: "Informativo: suma, no resta" },
  ],
  fortalezas: "explica el diagnóstico con orden y da ejemplos reales.",
  profundizar: "manejo de redes y bases de datos.",
};
