"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { CRITERIOS_POR_DEFECTO } from "./criterios-por-defecto";
import { MENSAJE_CON_POSTULACIONES, tienePostulaciones } from "./postulaciones";
import { REQUISITOS_POR_DEFECTO } from "./requisitos-por-defecto";
import { type Peso, repartir } from "./repartir";

// Acciones de requisitos, etapas y rúbrica. Cada una comprueba que la vacante sea de
// la empresa de la sesión; RLS vuelve a comprobarlo en la base.

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;
type Resultado = { ok: true } | { ok: false; mensaje: string };
type DatosRequisito = { oferta: string; minimo: string };

const UUID = /^[0-9a-f-]{36}$/i;
const TIPOS_ETAPA = ["cv", "texto", "voz", "entrevista"];
const MAXIMO_CRITERIOS = 20;

const FALLO = { ok: false as const, mensaje: "No pudimos guardar el cambio. Intenta de nuevo." };
const NO_ENCONTRADA = { ok: false as const, mensaje: "Vacante no encontrada." };
const CON_POSTULACIONES = { ok: false as const, mensaje: MENSAJE_CON_POSTULACIONES };

async function clienteDeVacante(vacanteId: string): Promise<Cliente | null> {
  if (!UUID.test(vacanteId)) return null;
  const { empresa } = await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("vacantes")
    .select("id")
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  return data ? supabase : null;
}

function refrescar(vacanteId: string) {
  revalidatePath(`/gestion/${vacanteId}`, "layout");
}

// ---------------------------------------------------------------------------
// Requisitos: lo que pide la oferta (público) y el mínimo aceptable (interno).
// ---------------------------------------------------------------------------
function revisarRequisito(d: DatosRequisito): string | null {
  if (d.oferta.length > 300 || d.minimo.length > 300) return "Cada texto admite hasta 300 caracteres.";
  return null;
}

export async function agregarRequisito(vacanteId: string, datos: DatosRequisito): Promise<Resultado> {
  const error = revisarRequisito(datos);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const oferta = datos.oferta.trim();
  const { data: requisito, error: errorOferta } = await supabase
    .from("requisitos_oferta")
    .insert({ vacante_id: vacanteId, descripcion: oferta, valor_oferta: oferta })
    .select("id")
    .single();
  if (errorOferta || !requisito) {
    console.error("[requisitos] insert", errorOferta);
    return FALLO;
  }

  if (datos.minimo.trim()) {
    const { error: errorMinimo } = await supabase
      .from("requisitos_minimos")
      .insert({ requisito_id: requisito.id, valor_minimo: datos.minimo.trim() });
    if (errorMinimo) {
      console.error("[requisitos] minimo", errorMinimo);
      return FALLO;
    }
  }

  refrescar(vacanteId);
  return { ok: true };
}

// Se llama al crear la vacante: deja los requisitos por defecto guardados.
export async function sembrarRequisitosPorDefecto(vacanteId: string): Promise<void> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return;
  for (const datos of REQUISITOS_POR_DEFECTO) {
    const oferta = datos.oferta.trim();
    const { data: requisito, error } = await supabase
      .from("requisitos_oferta")
      .insert({ vacante_id: vacanteId, descripcion: oferta, valor_oferta: oferta })
      .select("id")
      .single();
    if (error || !requisito) {
      console.error("[requisitos] sembrar", error);
      return;
    }
    if (datos.minimo.trim()) {
      const { error: errorMinimo } = await supabase
        .from("requisitos_minimos")
        .insert({ requisito_id: requisito.id, valor_minimo: datos.minimo.trim() });
      if (errorMinimo) console.error("[requisitos] sembrar minimo", errorMinimo);
    }
  }
}

export async function guardarRequisito(id: string, vacanteId: string, datos: DatosRequisito): Promise<Resultado> {
  const error = revisarRequisito(datos);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const oferta = datos.oferta.trim();
  const { error: errorOferta } = await supabase
    .from("requisitos_oferta")
    .update({ descripcion: oferta, valor_oferta: oferta })
    .eq("id", id)
    .eq("vacante_id", vacanteId);
  if (errorOferta) {
    console.error("[requisitos] update", errorOferta);
    return FALLO;
  }

  // Un mínimo vacío significa "sin mínimo": se borra la fila interna.
  const errorMinimo = datos.minimo.trim()
    ? (
        await supabase
          .from("requisitos_minimos")
          .upsert({ requisito_id: id, valor_minimo: datos.minimo.trim() }, { onConflict: "requisito_id" })
      ).error
    : (await supabase.from("requisitos_minimos").delete().eq("requisito_id", id)).error;
  if (errorMinimo) {
    console.error("[requisitos] minimo", errorMinimo);
    return FALLO;
  }

  refrescar(vacanteId);
  return { ok: true };
}

export async function quitarRequisito(id: string, vacanteId: string): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const { error } = await supabase.from("requisitos_oferta").delete().eq("id", id).eq("vacante_id", vacanteId);
  if (error) {
    console.error("[requisitos] delete", error);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Etapas: la empresa define cuántas, en qué orden, con qué nombre. Un tipo puede repetirse.
// ---------------------------------------------------------------------------
export async function agregarEtapa(vacanteId: string, tipo: string): Promise<Resultado> {
  if (!TIPOS_ETAPA.includes(tipo)) return { ok: false, mensaje: "Tipo de etapa no válido." };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { data: ultima } = await supabase
    .from("vacante_etapas")
    .select("orden")
    .eq("vacante_id", vacanteId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();
  const { error } = await supabase
    .from("vacante_etapas")
    .insert({ vacante_id: vacanteId, tipo, orden: (ultima?.orden ?? 0) + 1 });
  if (error) {
    console.error("[etapas] insert", error);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

export async function renombrarEtapa(id: string, vacanteId: string, nombre: string): Promise<Resultado> {
  if (nombre.trim().length > 80) return { ok: false, mensaje: "El nombre de la etapa admite hasta 80 caracteres." };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const { error } = await supabase
    .from("vacante_etapas")
    .update({ nombre: nombre.trim() || null })
    .eq("id", id)
    .eq("vacante_id", vacanteId);
  if (error) {
    console.error("[etapas] renombrar", error);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

// Intercambia el orden con la etapa de arriba o de abajo. El orden es único por
// vacante, así que el cambio pasa por un valor temporal.
export async function moverEtapa(id: string, vacanteId: string, direccion: "subir" | "bajar"): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  if (await tienePostulaciones(supabase, vacanteId)) return CON_POSTULACIONES;

  const { data: etapas } = await supabase
    .from("vacante_etapas")
    .select("id, orden")
    .eq("vacante_id", vacanteId)
    .order("orden")
    .returns<{ id: string; orden: number }[]>();
  if (!etapas) return FALLO;

  const i = etapas.findIndex((e) => e.id === id);
  const j = direccion === "subir" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= etapas.length) return { ok: true };

  const a = etapas[i];
  const b = etapas[j];
  const temporal = Math.max(...etapas.map((e) => e.orden)) + 1;
  const pasos = [
    supabase.from("vacante_etapas").update({ orden: temporal }).eq("id", a.id),
    supabase.from("vacante_etapas").update({ orden: a.orden }).eq("id", b.id),
    supabase.from("vacante_etapas").update({ orden: b.orden }).eq("id", a.id),
  ];
  for (const paso of pasos) {
    const { error } = await paso;
    if (error) {
      console.error("[etapas] mover", error);
      return FALLO;
    }
  }
  refrescar(vacanteId);
  return { ok: true };
}

export async function quitarEtapa(id: string, vacanteId: string): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  if (await tienePostulaciones(supabase, vacanteId)) return CON_POSTULACIONES;
  const { error }= await supabase.from("vacante_etapas").delete().eq("id", id).eq("vacante_id", vacanteId);
  if (error) {
    console.error("[etapas] delete", error);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rúbrica: hasta 20 criterios (con más, algún peso quedaría en 0). Los pesos (1 a 100)
// siempre suman 100.
// ---------------------------------------------------------------------------
async function aplicarPesos(supabase: Cliente, rubricaId: string, pesos: Peso[]): Promise<boolean> {
  const resultados = await Promise.all(
    pesos.map(({ id, peso }) => supabase.from("criterios").update({ peso }).eq("id", id).eq("rubrica_id", rubricaId)),
  );
  const fallo = resultados.find((r) => r.error);
  if (fallo) console.error("[rubrica] pesos", fallo.error);
  return !fallo;
}

async function rubricaDeVacante(supabase: Cliente, vacanteId: string): Promise<string | null> {
  const { data } = await supabase.from("rubricas").select("id").eq("vacante_id", vacanteId).maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

// Crea la rúbrica con los criterios por defecto si la vacante aún no tiene una.
// Así los criterios quedan guardados y, si la empresa los quita, no vuelven solos.
export async function sembrarRubricaSiFalta(vacanteId: string): Promise<void> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return;

  const { data: existente } = await supabase.from("rubricas").select("id").eq("vacante_id", vacanteId).maybeSingle();
  if (existente) return;

  const { data: rubrica, error } = await supabase
    .from("rubricas")
    .insert({ vacante_id: vacanteId })
    .select("id")
    .single();
  if (error || !rubrica) {
    console.error("[rubrica] sembrar", error);
    return;
  }
  const { error: errorCriterios } = await supabase
    .from("criterios")
    .insert(CRITERIOS_POR_DEFECTO.map((c) => ({ ...c, rubrica_id: rubrica.id })));
  if (errorCriterios) console.error("[rubrica] criterios por defecto", errorCriterios);
}

function revisarCriterio(nombre: string, descripcion: string): string | null {
  if (!nombre.trim() || nombre.trim().length > 80) return "El criterio necesita un nombre de hasta 80 caracteres.";
  if (descripcion.length > 300) return "La descripción admite hasta 300 caracteres.";
  return null;
}

export async function agregarCriterio(vacanteId: string, nombre: string, descripcion: string): Promise<Resultado> {
  const error = revisarCriterio(nombre, descripcion);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  await sembrarRubricaSiFalta(vacanteId);
  const rubricaId = await rubricaDeVacante(supabase, vacanteId);
  if (!rubricaId) return FALLO;

  const { data: existentes, error: errorExistentes } = await supabase
    .from("criterios")
    .select("id, peso")
    .eq("rubrica_id", rubricaId)
    .returns<Peso[]>();
  if (errorExistentes || !existentes) return FALLO;
  if (existentes.length >= MAXIMO_CRITERIOS) {
    return { ok: false, mensaje: `La rúbrica admite hasta ${MAXIMO_CRITERIOS} criterios.` };
  }

  const { data: nuevo, error: errorCriterio } = await supabase
    .from("criterios")
    .insert({
      rubrica_id: rubricaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      peso: Math.floor(100 / (existentes.length + 1)),
    })
    .select("id, peso")
    .single<Peso>();
  if (errorCriterio || !nuevo) {
    console.error("[rubrica] insert", errorCriterio);
    return FALLO;
  }

  const ok = await aplicarPesos(supabase, rubricaId, repartir([...existentes, nuevo], nuevo));
  refrescar(vacanteId);
  return ok ? { ok: true } : FALLO;
}

export async function guardarCriterio(id: string, vacanteId: string, nombre: string, descripcion: string): Promise<Resultado> {
  const error = revisarCriterio(nombre, descripcion);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const rubricaId = await rubricaDeVacante(supabase, vacanteId);
  if (!rubricaId) return NO_ENCONTRADA;

  // El criterio debe ser de la rúbrica de esta vacante, no de otra de la misma empresa.
  const { data, error: errorUpdate } = await supabase
    .from("criterios")
    .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
    .eq("id", id)
    .eq("rubrica_id", rubricaId)
    .select("id");
  if (errorUpdate) {
    console.error("[rubrica] update", errorUpdate);
    return FALLO;
  }
  if (!data?.length) return { ok: false, mensaje: "Criterio no encontrado." };
  refrescar(vacanteId);
  return { ok: true };
}

// Cambia el peso de un criterio y reparte la diferencia entre los demás para que sumen 100.
export async function cambiarPesoCriterio(id: string, vacanteId: string, peso: number): Promise<Resultado> {
  if (!Number.isInteger(peso) || peso < 1 || peso > 100) return { ok: false, mensaje: "El peso va de 1 a 100." };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const rubricaId = await rubricaDeVacante(supabase, vacanteId);
  if (!rubricaId) return NO_ENCONTRADA;

  const { data: todos } = await supabase.from("criterios").select("id, peso").eq("rubrica_id", rubricaId).returns<Peso[]>();
  if (!todos) return FALLO;
  if (!todos.some((c) => c.id === id)) return { ok: false, mensaje: "Criterio no encontrado." };

  const ok = await aplicarPesos(supabase, rubricaId, repartir(todos, { id, peso }));
  refrescar(vacanteId);
  return ok ? { ok: true } : FALLO;
}

export async function quitarCriterio(id: string, vacanteId: string): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const rubricaId = await rubricaDeVacante(supabase, vacanteId);
  if (!rubricaId) return NO_ENCONTRADA;

  const { data, error } = await supabase.from("criterios").delete().eq("id", id).eq("rubrica_id", rubricaId).select("id");
  if (error) {
    console.error("[rubrica] delete", error);
    return FALLO;
  }
  if (!data?.length) return { ok: false, mensaje: "Criterio no encontrado." };

  const { data: restantes } = await supabase.from("criterios").select("id, peso").eq("rubrica_id", rubricaId).returns<Peso[]>();
  const ok = restantes?.length ? await aplicarPesos(supabase, rubricaId, repartir(restantes)) : true;
  refrescar(vacanteId);
  return ok ? { ok: true } : FALLO;
}
