import { notFound } from "next/navigation";
import { crearClientePostulante } from "@/lib/supabase/servidor";

export type VacantePublica = {
  id: string;
  cargo: string;
  descripcion: string | null;
  enlace_token: string;
  primera_etapa_id: string | null;
  empresa_nombre: string;
  empresa_logo_url: string | null;
};

// Busca una vacante abierta por su enlace público. Si no existe o está cerrada, 404.
// vacante_publica devuelve solo la vacante de ese token: el link no permite listar las demás.
export async function vacantePorToken(token: string): Promise<VacantePublica> {
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = await crearClientePostulante();
  const { data } = await supabase.rpc("vacante_publica", { p_token: token }).maybeSingle<VacantePublica>();
  if (!data) notFound();
  return data;
}
