"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { type Peso, repartir } from "./repartir";

// Acciones de requisitos, etapas y rúbrica. Cada una comprueba que la vacante sea de
// la empresa de la sesión; RLS vuelve a comprobarlo en la base.

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;
type Resultado = { ok: true } | { ok: false; mensaje: string };
type DatosRequisito = { nombre: string; oferta: string; minimo: string };

const UUID = /^[0-9a-f-]{36}$/i;
const TIPOS_ETAPA = ["cv", "texto", "voz", "entrevista"];

const FALLO = { ok: false as const, mensaje: "No pudimos guardar el cambio. Intenta de nuevo." };
const NO_ENCONTRADA = { ok: false as const, mensaje: "Vacante no encontrada." };

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

function revisarRequisito(d: DatosRequisito): string | null {
  if (!d.nombre.trim() || d.nombre.trim().length > 80) return "El requisito necesita un nombre de hasta 80 caracteres.";
  if (d.oferta.length > 300 || d.minimo.length > 300) return "Cada texto admite hasta 300 caracteres.";
  return null;
}

// ---------------------------------------------------------------------------
// Requisitos: lo público (oferta) y lo interno (mínimo) van en tablas separadas.
// ---------------------------------------------------------------------------
export async function agregarRequisito(vacanteId: string, datos: DatosRequisito): Promise<Resultado> {
  const error = revisarRequisito(datos);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { data: requisito, error: errorOferta } = await supabase
    .from("requisitos_oferta")
    .insert({ vacante_id: vacanteId, descripcion: datos.nombre.trim(), valor_oferta: datos.oferta.trim() })
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

export async function guardarRequisito(id: string, vacanteId: string, datos: DatosRequisito): Promise<Resultado> {
  const error = revisarRequisito(datos);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { error: errorOferta } = await supabase
    .from("requisitos_oferta")
    .update({ descripcion: datos.nombre.trim(), valor_oferta: datos.oferta.trim() })
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
// Etapas: la empresa define cuántas y en qué orden. Un tipo puede repetirse.
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

export async function quitarEtapa(id: string, vacanteId: string): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;
  const { error } = await supabase.from("vacante_etapas").delete().eq("id", id).eq("vacante_id", vacanteId);
  if (error) {
    console.error("[etapas] delete", error);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rúbrica: criterios sin límite de cantidad. Los pesos (1 a 100) siempre suman 100.
// ---------------------------------------------------------------------------
async function aplicarPesos(supabase: Cliente, pesos: Peso[]) {
  await Promise.all(
    pesos.map(({ id, peso }) => supabase.from("criterios").update({ peso }).eq("id", id)),
  );
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

  const { data: rubrica, error: errorRubrica } = await supabase
    .from("rubricas")
    .upsert({ vacante_id: vacanteId }, { onConflict: "vacante_id" })
    .select("id")
    .single();
  if (errorRubrica || !rubrica) {
    console.error("[rubrica] upsert", errorRubrica);
    return FALLO;
  }

  const { data: existentes } = await supabase.from("criterios").select("id, peso").eq("rubrica_id", rubrica.id);
  const n = (existentes?.length ?? 0) + 1;
  const { data: nuevo, error: errorCriterio } = await supabase
    .from("criterios")
    .insert({ rubrica_id: rubrica.id, nombre: nombre.trim(), descripcion: descripcion.trim() || null, peso: Math.floor(100 / n) })
    .select("id, peso")
    .single<Peso>();
  if (errorCriterio || !nuevo) {
    console.error("[rubrica] insert", errorCriterio);
    return FALLO;
  }

  await aplicarPesos(supabase, repartir([...(existentes ?? []), nuevo], nuevo));
  refrescar(vacanteId);
  return { ok: true };
}

export async function guardarCriterio(id: string, vacanteId: string, nombre: string, descripcion: string): Promise<Resultado> {
  const error = revisarCriterio(nombre, descripcion);
  if (error) return { ok: false, mensaje: error };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { error: errorUpdate } = await supabase
    .from("criterios")
    .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
    .eq("id", id);
  if (errorUpdate) {
    console.error("[rubrica] update", errorUpdate);
    return FALLO;
  }
  refrescar(vacanteId);
  return { ok: true };
}

// Cambia el peso de un criterio y reparte la diferencia entre los demás para que sumen 100.
export async function cambiarPesoCriterio(id: string, vacanteId: string, peso: number): Promise<Resultado> {
  if (!Number.isInteger(peso) || peso < 1 || peso > 100) return { ok: false, mensaje: "El peso va de 1 a 100." };
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { data: criterio } = await supabase
    .from("criterios")
    .select("rubrica_id")
    .eq("id", id)
    .maybeSingle<{ rubrica_id: string }>();
  if (!criterio) return NO_ENCONTRADA;

  const { data: todos } = await supabase.from("criterios").select("id, peso").eq("rubrica_id", criterio.rubrica_id);
  if (!todos) return FALLO;

  await aplicarPesos(supabase, repartir(todos, { id, peso }));
  refrescar(vacanteId);
  return { ok: true };
}

export async function quitarCriterio(id: string, vacanteId: string): Promise<Resultado> {
  const supabase = await clienteDeVacante(vacanteId);
  if (!supabase) return NO_ENCONTRADA;

  const { data: criterio } = await supabase
    .from("criterios")
    .select("rubrica_id")
    .eq("id", id)
    .maybeSingle<{ rubrica_id: string }>();
  if (!criterio) return NO_ENCONTRADA;

  const { error } = await supabase.from("criterios").delete().eq("id", id);
  if (error) {
    console.error("[rubrica] delete", error);
    return FALLO;
  }

  const { data: restantes } = await supabase.from("criterios").select("id, peso").eq("rubrica_id", criterio.rubrica_id);
  if (restantes?.length) await aplicarPesos(supabase, repartir(restantes));
  refrescar(vacanteId);
  return { ok: true };
}
