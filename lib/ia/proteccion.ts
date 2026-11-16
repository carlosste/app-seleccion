// Defensas del servidor alrededor de la IA. No reemplazan las reglas del prompt: las respaldan,
// porque el prompt no es una garantía. Sin dependencias, para poder probarlas solas
// (scripts/pruebas-inyeccion.mjs).

// Minúsculas, sin tildes y con los espacios colapsados: para comparar citas y buscar frases.
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Frases típicas de quien intenta dar órdenes a la IA desde una respuesta o un CV. Es un detector
// simple y barato: un falso aviso solo pide que una persona revise; nunca descarta a nadie.
const PATRONES: { patron: RegExp; motivo: string }[] = [
  { patron: /\b(ignora|ignorar|olvida|omite|descarta|ignore|disregard|forget)\b.{0,40}\b(instruccion|instrucciones|reglas|indicaciones|anterior|anteriores|instructions|rules|previous)/, motivo: "pide ignorar las instrucciones" },
  { patron: /\b(asigna|asignale|asignar|asignen|ponle|ponme|dale|dame|otorga|otorgale|califica|calificame|calificalo|puntua|puntuame|marca|marcar|marquen)\b.{0,40}\b(100|cien|puntaje maximo|maxima nota|nota maxima|cumple)\b/, motivo: "pide un puntaje o veredicto" },
  { patron: /\b(assign|give|score|rate|mark)\b.{0,40}\b(100|maximum|max score|full marks|meets)\b/, motivo: "pide un puntaje o veredicto" },
  { patron: /\b(eres|actua como|a partir de ahora eres|you are now|act as)\b.{0,30}\b(asistente|modelo|ia|evaluador|assistant|model|ai|system)\b/, motivo: "intenta cambiar el papel de la IA" },
  { patron: /(^|[\s\[<(])(system|sistema|system prompt|prompt del sistema)\s*[:>\]]/, motivo: "imita un mensaje del sistema" },
  { patron: /<<<|>>>|fin_datos|<\/?(system|instrucciones|instructions)>/, motivo: "intenta cerrar el bloque de datos" },
  // normalizar quita las comillas: {"puntaje": 100} queda {puntaje: 100}.
  { patron: /[{,[]\s*(puntaje|score|ajuste|veredicto|estado|intento_manipulacion)\s*:/, motivo: "trae un JSON con puntajes" },
  { patron: /\b(nuevas instrucciones|new instructions|instrucciones para la ia|nota para la ia|note to ai|mensaje para la ia)\b/, motivo: "trae instrucciones para la IA" },
];

// Devuelve el motivo del primer patrón que encuentre, o null si el texto parece normal.
export function detectarManipulacion(textos: string | string[]): string | null {
  for (const t of Array.isArray(textos) ? textos : [textos]) {
    const n = normalizar(t);
    for (const { patron, motivo } of PATRONES) if (patron.test(n)) return motivo;
  }
  return null;
}

// La cita sustenta el puntaje solo si aparece tal cual (normalizada) en la respuesta indicada.
// Una cita muy corta no prueba nada.
export function citaVerificada(cita: string, respuesta: string): boolean {
  const c = normalizar(cita).replace(/[.…]+$/, "").trim();
  return c.length >= 8 && normalizar(respuesta).includes(c);
}

// Datos personales que nunca deben quedar en la hoja de vida resumida ni en las evidencias:
// correos, teléfonos y secuencias de 6 o más dígitos (documentos, cuentas).
const CORREO = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const TELEFONO = /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const DIGITOS = /\d(?:[\s.-]?\d){5,}/g;
export const OCULTO = "[dato oculto]";

export function enmascararDatosPersonales(texto: string): string {
  return texto
    .replace(CORREO, OCULTO)
    .replace(TELEFONO, OCULTO)
    .replace(DIGITOS, (m) => (/^\d{4}\s*-\s*\d{4}$/.test(m) ? m : OCULTO)); // "2018-2022" es un rango de años
}

// Un PDF de verdad empieza con %PDF-. Se comprueba antes de enviarlo a la IA y antes de servirlo.
export function esPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
}
