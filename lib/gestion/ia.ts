"use server";

import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJson } from "@/lib/ia/gemini";

export type RequisitoSugerido = { nombre: string; descripcion: string };
type ResultadoSugerencias = { ok: true; requisitos: RequisitoSugerido[] } | { ok: false; mensaje: string };

// Solo una consulta: no guarda nada. La empresa decide si agrega algo después.
export async function sugerirRequisitos(cargo: string, descripcion: string): Promise<ResultadoSugerencias> {
  await requerirEmpresa();
  if (cargo.trim().length < 3) return { ok: false, mensaje: "Escribe el cargo para consultar requisitos." };

  try {
    const { requisitos } = await pedirJson<{ requisitos: RequisitoSugerido[] }>(
      'Eres asistente de selección de personal. Sugiere entre 5 y 7 requisitos que se pueden pedir para el cargo. ' +
        'Cada uno tiene "nombre" (corto, por ejemplo Formación, Experiencia, Idioma) y "descripcion" (breve). ' +
        'Devuelve {"requisitos": [{"nombre": "...", "descripcion": "..."}]}.',
      `Cargo: ${cargo.trim()}\nDescripción del cargo dada por la empresa: ${descripcion.trim() || "(sin descripción)"}`,
    );
    return {
      ok: true,
      requisitos: requisitos.slice(0, 7).map((r) => ({ nombre: String(r.nombre), descripcion: String(r.descripcion) })),
    };
  } catch (error) {
    console.error("[ia] sugerirRequisitos", error);
    return { ok: false, mensaje: "No pudimos consultar la IA. Intenta de nuevo en unos minutos." };
  }
}
