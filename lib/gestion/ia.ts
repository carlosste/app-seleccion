"use server";

import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJson } from "@/lib/ia/gemini";

export type RequisitoSugerido = { nombre: string; descripcion: string };
type ResultadoSugerencias = { ok: true; requisitos: RequisitoSugerido[] } | { ok: false; mensaje: string };

// Solo una consulta: no guarda nada. La empresa decide si agrega algo después.
export async function sugerirRequisitos(cargo: string, descripcion: string): Promise<ResultadoSugerencias> {
  await requerirEmpresa();
  if (cargo.trim().length < 3) return { ok: false, mensaje: "Escribe el cargo para consultar requisitos." };
  // Mismos límites que el formulario de la vacante: no se envían textos enormes a la IA.
  if (cargo.trim().length > 120 || descripcion.length > 2000) {
    return { ok: false, mensaje: "El cargo admite hasta 120 caracteres y la descripción hasta 2000." };
  }

  try {
    const { requisitos } = await pedirJson<{ requisitos?: RequisitoSugerido[] }>(
      'Eres asistente de selección de personal. Sugiere entre 5 y 7 requisitos que se pueden pedir para el cargo. ' +
        'Cada uno tiene "nombre" (corto, por ejemplo Formación, Experiencia, Idioma) y "descripcion" (breve). ' +
        'Devuelve {"requisitos": [{"nombre": "...", "descripcion": "..."}]}.',
      `Cargo: ${cargo.trim()}\nDescripción del cargo dada por la empresa: ${descripcion.trim() || "(sin descripción)"}`,
    );
    // La IA puede devolver un JSON válido pero con otra forma: se descarta lo que no sirve.
    const limpios = (Array.isArray(requisitos) ? requisitos : [])
      .map((r) => ({ nombre: String(r?.nombre ?? "").trim().slice(0, 80), descripcion: String(r?.descripcion ?? "").trim().slice(0, 300) }))
      .filter((r) => r.nombre && r.descripcion)
      .slice(0, 7);
    if (limpios.length === 0) return { ok: false, mensaje: "La IA no devolvió requisitos. Intenta de nuevo." };
    return { ok: true, requisitos: limpios };
  } catch (error) {
    console.error("[ia] sugerirRequisitos", error);
    return { ok: false, mensaje: "No pudimos consultar la IA. Intenta de nuevo en unos minutos." };
  }
}
