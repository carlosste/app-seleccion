import "server-only";
import { pedirJson } from "@/lib/ia/gemini";

// Requisitos de una vacante nueva. Desde el 2026-10-28 los propone la IA según el cargo
// (antes eran siempre los mismos de soporte técnico). La empresa puede cambiarlos o quitarlos.
// Lo público es la oferta; el mínimo es interno.

export type RequisitoPropuesto = { oferta: string; minimo: string };

// Solo edad mínima; nunca edad máxima (reglas éticas de CLAUDE.md). La agrega el código, no la IA.
const EDAD_MINIMA: RequisitoPropuesto = { oferta: "", minimo: "Mayor de 18 años" };

// Si la IA no responde, la vacante se crea solo con la edad mínima y se avisa a la empresa.
export const REQUISITOS_POR_DEFECTO: RequisitoPropuesto[] = [EDAD_MINIMA];

// Lo que la IA no debe proponer aunque se lo salte: la edad va aparte y lo demás discrimina.
const PROHIBIDO = /\b(edad|g[eé]nero|sexo|estado civil|apariencia|estatura|religi[oó]n|f[ií]sic[oa]|salud|vacuna)/i;

export async function proponerRequisitos(cargo: string, descripcion: string): Promise<RequisitoPropuesto[]> {
  const { requisitos } = await pedirJson<{ requisitos?: { oferta?: string; minimo?: string }[] }>(
    "Eres asistente de selección de personal. Propón entre 4 y 6 requisitos para la oferta de empleo, propios " +
      'del cargo (no de otro oficio). Cada uno es {"oferta", "minimo"}. "oferta" es lo que pide la oferta, corto y ' +
      'público, por ejemplo "Bachiller", "2 años en bodega o inventarios" o "Manejo de transpaleta". "minimo" es lo ' +
      "mínimo aceptable para no descartar a alguien, interno, y se debe entender solo, sin leer la oferta, porque se " +
      'compara así contra la hoja de vida: escribe "1 año de experiencia en bodega", no "1 año"; "Registro ReTHUS ' +
      'activo", no "Activo". Déjalo vacío ("") si el requisito es deseable y no debe descartar. Pide solo lo que se ' +
      "puede ver en una hoja de vida (formación, experiencia, cursos, licencias, herramientas); los mínimos deben ser " +
      "realistas para el cargo. No incluyas edad, género, estado civil, apariencia, religión, condición física, " +
      "salud ni rasgos personales. " +
      'Devuelve {"requisitos": [{"oferta": "...", "minimo": "..."}]}.',
    `Cargo: ${cargo.trim()}\nDescripción del cargo: ${descripcion.trim() || "(sin descripción)"}`,
  );

  // La IA puede devolver un JSON válido con otra forma: se descarta lo que no sirve.
  const limpios = (Array.isArray(requisitos) ? requisitos : [])
    .map((r) => ({ oferta: String(r?.oferta ?? "").trim().slice(0, 300), minimo: String(r?.minimo ?? "").trim().slice(0, 300) }))
    .filter((r) => r.oferta && !PROHIBIDO.test(`${r.oferta} ${r.minimo}`))
    .slice(0, 6);
  if (limpios.length === 0) throw new Error("La IA no devolvió requisitos");
  return [...limpios, EDAD_MINIMA];
}
