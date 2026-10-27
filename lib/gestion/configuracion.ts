import "server-only";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Lecturas de requisitos, etapas y rúbrica de una vacante. RLS limita a la empresa de la sesión.

export type RequisitoVacante = { id: string; nombre: string; oferta: string; minimo: string };
export type EtapaVacante = { id: string; tipo: "cv" | "texto" | "voz" | "entrevista"; orden: number };
export type CriterioVacante = { id: string; nombre: string; descripcion: string; peso: number };

export async function listarRequisitos(vacanteId: string): Promise<RequisitoVacante[]> {
  await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("requisitos_oferta")
    .select("id, descripcion, valor_oferta, requisitos_minimos(valor_minimo)")
    .eq("vacante_id", vacanteId)
    .order("created_at")
    .returns<
      {
        id: string;
        descripcion: string;
        valor_oferta: string;
        requisitos_minimos: { valor_minimo: string } | { valor_minimo: string }[] | null;
      }[]
    >();
  if (error) throw new Error(`No se pudieron leer los requisitos: ${error.message}`);

  return data.map((r) => {
    const minimo = Array.isArray(r.requisitos_minimos) ? r.requisitos_minimos[0] : r.requisitos_minimos;
    return { id: r.id, nombre: r.descripcion, oferta: r.valor_oferta, minimo: minimo?.valor_minimo ?? "" };
  });
}

export async function listarEtapas(vacanteId: string): Promise<EtapaVacante[]> {
  await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vacante_etapas")
    .select("id, tipo, orden")
    .eq("vacante_id", vacanteId)
    .order("orden")
    .returns<EtapaVacante[]>();
  if (error) throw new Error(`No se pudieron leer las etapas: ${error.message}`);
  return data;
}

export async function listarCriterios(vacanteId: string): Promise<CriterioVacante[]> {
  await requerirEmpresa();
  const supabase = await crearClienteServidor();
  const { data: rubrica } = await supabase
    .from("rubricas")
    .select("id")
    .eq("vacante_id", vacanteId)
    .maybeSingle<{ id: string }>();
  if (!rubrica) return [];

  const { data, error } = await supabase
    .from("criterios")
    .select("id, nombre, descripcion, peso")
    .eq("rubrica_id", rubrica.id)
    .order("created_at")
    .returns<{ id: string; nombre: string; descripcion: string | null; peso: number }[]>();
  if (error) throw new Error(`No se pudieron leer los criterios: ${error.message}`);
  return data.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion ?? "", peso: c.peso }));
}
