// Requisitos sugeridos según el cargo. Son solo un punto de partida: la empresa los
// agrega, cambia o ignora. Nunca piden edad máxima, género ni estado civil.
export type Sugerencia = { nombre: string; oferta: string; minimo: string };

const GENERICOS: Sugerencia[] = [
  { nombre: "Formación", oferta: "Bachiller o formación técnica", minimo: "Bachiller" },
  { nombre: "Experiencia", oferta: "1 año en un cargo similar", minimo: "6 meses" },
  { nombre: "Ofimática", oferta: "Excel y Word intermedio", minimo: "Excel básico" },
  { nombre: "Idioma", oferta: "Inglés básico (A2)", minimo: "" },
];

const POR_FAMILIA: { claves: string[]; requisitos: Sugerencia[] }[] = [
  {
    claves: ["auxiliar", "administrativ", "asistente", "secretari"],
    requisitos: [
      { nombre: "Formación", oferta: "Técnico o tecnólogo en administración o afines", minimo: "Bachiller" },
      { nombre: "Experiencia", oferta: "1 año en funciones administrativas", minimo: "6 meses" },
      { nombre: "Ofimática", oferta: "Excel y Word intermedio", minimo: "Excel básico" },
      { nombre: "Archivo y correspondencia", oferta: "Manejo de archivo y radicación de documentos", minimo: "" },
    ],
  },
  {
    claves: ["soporte", "sistema", "desarrollad", "programad", "software", "web", "tecnic"],
    requisitos: [
      { nombre: "Formación", oferta: "Tecnólogo en sistemas o afines", minimo: "Técnico en sistemas" },
      { nombre: "Experiencia", oferta: "3 años en soporte técnico", minimo: "1 año" },
      { nombre: "Idioma", oferta: "Inglés B2", minimo: "Inglés B1" },
      { nombre: "Certificación", oferta: "CCNA (deseable)", minimo: "" },
    ],
  },
  {
    claves: ["contad", "contab", "financ", "tesorer"],
    requisitos: [
      { nombre: "Formación", oferta: "Contador público o técnico contable", minimo: "Técnico contable" },
      { nombre: "Experiencia", oferta: "2 años en contabilidad", minimo: "1 año" },
      { nombre: "Software contable", oferta: "Manejo de software contable (SIIGO o similar)", minimo: "Excel avanzado" },
    ],
  },
  {
    claves: ["vend", "comercial", "ventas", "asesor"],
    requisitos: [
      { nombre: "Formación", oferta: "Bachiller o técnico en ventas", minimo: "Bachiller" },
      { nombre: "Experiencia", oferta: "1 año en ventas", minimo: "6 meses" },
      { nombre: "Disponibilidad", oferta: "Disponibilidad de horario", minimo: "" },
    ],
  },
];

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function sugerenciasPara(cargo: string): Sugerencia[] {
  const c = normalizar(cargo);
  const familia = POR_FAMILIA.find((f) => f.claves.some((k) => c.includes(k)));
  return familia ? familia.requisitos : GENERICOS;
}
