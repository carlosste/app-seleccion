import { redirect } from "next/navigation";
import { connection } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { vacantePorToken } from "@/lib/vacante-publica";
import { PreguntasVoz, type PreguntaPendiente } from "@/components/preguntas-voz";

// 3 · Preguntas de la etapa, una por una. Son iguales para todos los postulantes del cargo.
// Solo entra quien tiene sesión y una postulación en esta vacante. Muestra las que le faltan:
// la revisión de CV es interna, así que desde el inicio ve la primera etapa de preguntas.
export default async function Preguntas({ params }: { params: Promise<{ vacante: string }> }) {
  // Depende de la sesión y de lo que ya respondió: nunca se prerenderiza.
  await connection();
  const { vacante: token } = await params;
  const vacante = await vacantePorToken(token);
  const terminado = `/postular/${token}/terminado`;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/postular/${token}/ingreso`);

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id, estado")
    .eq("postulante_id", user.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string; estado: string }>();
  if (!postulacion) redirect(`/postular/${token}?error=sin-postulacion`);
  if (postulacion.estado !== "en_proceso") redirect(terminado);

  const { data, error } = await supabase.rpc("preguntas_pendientes", { p_postulacion: postulacion.id });
  if (error) throw new Error(`No se pudieron leer las preguntas: ${error.message}`);
  const pendientes = data as { pregunta_id: string; texto: string; tipo_etapa: "texto" | "voz"; numero: number; total: number }[] | null;
  if (!pendientes?.length) redirect(terminado);

  const preguntas: PreguntaPendiente[] = pendientes.map((p) => ({
    id: p.pregunta_id,
    texto: p.texto,
    tipoEtapa: p.tipo_etapa,
    numero: p.numero,
    total: p.total,
  }));

  return <PreguntasVoz token={token} preguntas={preguntas} rutaTerminado={terminado} />;
}
