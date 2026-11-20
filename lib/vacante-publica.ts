import { notFound } from "next/navigation";
import { cache } from "react";
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
// `cache`: la página y su título (generateMetadata) la piden en la misma carga y se consulta una vez.
export const vacantePorToken = cache(async (token: string): Promise<VacantePublica> => {
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = await crearClientePostulante();
  const { data } = await supabase.rpc("vacante_publica", { p_token: token }).maybeSingle<VacantePublica>();
  if (!data) notFound();
  return data;
});

// Título de la pestaña en las pantallas del postulante: "Cargo · Empresa".
export async function tituloVacante(token: string, antes?: string) {
  const v = await vacantePorToken(token);
  return [antes, v.cargo, v.empresa_nombre].filter(Boolean).join(" · ");
}
