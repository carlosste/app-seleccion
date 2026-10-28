import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type VacantePublica = {
  id: string;
  cargo: string;
  descripcion: string | null;
  enlace_token: string;
  primera_etapa_id: string | null;
  empresa_nombre: string | null;
  empresa_logo_url: string | null;
};

// Busca una vacante abierta por su enlace público. Si no existe o está cerrada, 404.
// vacante_publica devuelve solo la vacante de ese token: el link ya no permite listar las demás.
export async function vacantePorToken(token: string): Promise<VacantePublica> {
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("vacante_publica", { p_token: token }).maybeSingle<VacantePublica>();

  // TEMPORAL: mientras la migración correcciones_seguridad no esté aplicada, la función no
  // existe (PGRST202) y se usa la vista anterior. Quitar en la fase 2.
  if (error?.code === "PGRST202") return vacantePorTokenAnterior(token);

  if (!data) notFound();
  return data;
}

async function vacantePorTokenAnterior(token: string): Promise<VacantePublica> {
  const supabase = await crearClienteServidor();
  const { data: vacante } = await supabase
    .from("v_vacantes_publicas")
    .select("id, cargo, descripcion, enlace_token")
    .eq("enlace_token", token)
    .maybeSingle<{ id: string; cargo: string; descripcion: string | null; enlace_token: string }>();
  if (!vacante) notFound();

  const { data: primera } = await supabase
    .from("vacante_etapas")
    .select("id")
    .eq("vacante_id", vacante.id)
    .order("orden")
    .limit(1)
    .maybeSingle<{ id: string }>();

  return { ...vacante, primera_etapa_id: primera?.id ?? null, empresa_nombre: null, empresa_logo_url: null };
}
