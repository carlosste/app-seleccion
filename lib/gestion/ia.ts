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
