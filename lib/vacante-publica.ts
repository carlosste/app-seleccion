import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Busca una vacante abierta por su enlace público. Si no existe o está cerrada, 404.
export async function vacantePorToken(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = await crearClienteServidor();
  const { data: vacante } = await supabase
    .from("v_vacantes_publicas")
    .select("id, cargo, descripcion, enlace_token")
    .eq("enlace_token", token)
    .maybeSingle();

  if (!vacante) notFound();
  return vacante;
}
