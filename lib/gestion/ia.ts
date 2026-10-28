"use server";

import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { pedirJson } from "@/lib/ia/gemini";

// Borrador de la descripción pública. No guarda nada: la empresa lo revisa, lo ajusta y lo guarda.
// No recibe los requisitos mínimos, así que no puede filtrarlos a la oferta.
export async function redactarDescripcion(cargo: string, borrador: string): Promise<{ ok: true; texto: string } | { ok: false; mensaje: string }> {
  await requerirEmpresa();
  if (cargo.trim().length < 3 || cargo.trim().length > 120 || borrador.length > 2000) {
    return { ok: false, mensaje: "Revisa el cargo y la descripción (máximo 2000 caracteres)." };
  }

  try {
    const { descripcion } = await pedirJson<{ descripcion?: string }>(
      "Eres asistente de selección de personal. Redacta la descripción pública de una oferta de empleo para los " +
        "postulantes: qué hará la persona, en qué entorno y qué se ofrece en términos generales. Entre 60 y 150 " +
        "palabras, en tono claro y cercano, sin listas de requisitos ni mínimos, sin inventar salario, ciudad ni " +
        "beneficios concretos. Si te dan un borrador, mejóralo y respeta lo que dice. " +
        'Devuelve {"descripcion": "..."}.',
      `Cargo: ${cargo.trim()}\nBorrador de la empresa: ${borrador.trim() || "(sin borrador)"}`,
    );
    const texto = String(descripcion ?? "").trim().slice(0, 2000);
    if (!texto) return { ok: false, mensaje: "La IA no devolvió una descripción. Intenta de nuevo." };
    return { ok: true, texto };
  } catch (error) {
    console.error("[ia] redactarDescripcion", error);
    return { ok: false, mensaje: "No pudimos consultar la IA. Intenta de nuevo en unos minutos." };
  }
}

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
