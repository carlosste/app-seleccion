"use server";

import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { registrarError } from "@/lib/registro";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { compararPerfilesIa, type Criterio, LARGO_PREGUNTA_COMPARAR, type ResultadoComparacion } from "./calificacion-ia";
import { leerNumeros, MIN_COMPARAR, perfilesParaComparar } from "./comparar-datos";
import { esUuid, obtenerVacante } from "./datos";

// Comparar perfiles con una pregunta libre (2026-11-19, Carlos). La respuesta no se guarda: se
// muestra en el momento. Solo queda en registro_actividad que alguien comparó, y a quiénes.
// Los perfiles se arman de nuevo en el servidor: nunca se usa lo que mande el navegador.

export type RespuestaComparar = { ok: true; resultado: ResultadoComparacion } | { ok: false; mensaje: string };

export async function compararPerfiles(vacanteId: string, numerosTexto: string, pregunta: string): Promise<RespuestaComparar> {
  if (!esUuid(vacanteId)) return { ok: false, mensaje: "Vacante no encontrada." };
  const limpia = String(pregunta ?? "").replace(/\s+/g, " ").trim();
  if (limpia.length < 5) return { ok: false, mensaje: "Escribe qué quieres saber de estos perfiles." };
  if (limpia.length > LARGO_PREGUNTA_COMPARAR) return { ok: false, mensaje: `La pregunta va hasta ${LARGO_PREGUNTA_COMPARAR} caracteres.` };

  const sesion = await requerirEmpresa();
  const vacante = await obtenerVacante(vacanteId);
  if (!vacante) return { ok: false, mensaje: "Vacante no encontrada." };

  const perfiles = await perfilesParaComparar(vacante.id, leerNumeros(numerosTexto));
  if (perfiles.length < MIN_COMPARAR) return { ok: false, mensaje: "Elige al menos dos candidatos de esta vacante." };
  if (perfiles.every((p) => p.ajusteTotal == null && !p.hojaDeVida.length && !p.entrevista)) {
    return { ok: false, mensaje: "Ninguno de estos perfiles está evaluado todavía. Usa “Evaluar con IA” en cada uno primero." };
  }

  const supabase = await crearClienteServidor();
  const { data: rubrica } = await supabase.from("rubricas").select("id").eq("vacante_id", vacante.id).maybeSingle<{ id: string }>();
  const { data: criterios } = rubrica
    ? await supabase.from("criterios").select("nombre, descripcion, peso").eq("rubrica_id", rubrica.id).order("created_at").returns<Criterio[]>()
    : { data: [] as Criterio[] };

  let resultado: ResultadoComparacion;
  try {
    // A la IA no le llega la decisión interna, solo lo evaluado.
    resultado = await compararPerfilesIa(
      { cargo: vacante.cargo, descripcion: vacante.descripcion },
      criterios ?? [],
      perfiles.map(({ decision: _d, ...p }) => p),
      limpia,
    );
  } catch (error) {
    registrarError("[ia] compararPerfiles", error);
    return { ok: false, mensaje: "No pudimos comparar con la IA. Intenta de nuevo en unos minutos." };
  }

  const { error } = await crearClienteAdmin()
    .from("registro_actividad")
    .insert({ empresa_id: sesion.empresa.id, usuario_id: sesion.usuarioId, accion: "comparar_perfiles", tabla: "vacantes", registro_id: vacante.id });
  if (error) registrarError("[comparar] registro", error);

  return { ok: true, resultado };
}
