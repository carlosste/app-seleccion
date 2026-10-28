import { redirect } from "next/navigation";
import { preguntasVoz } from "@/lib/datos-prueba";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { vacantePorToken } from "@/lib/vacante-publica";
import { PreguntasVoz } from "@/components/preguntas-voz";

// 3 · Preguntas de la etapa, una por una. Son iguales para todos los postulantes del cargo.
// Solo entra quien tiene sesión y una postulación en esta vacante.
// Las preguntas siguen siendo de prueba hasta el bloque B.
export default async function Preguntas({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: token } = await params;
  const vacante = await vacantePorToken(token);

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/postular/${token}?error=sesion`);

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", user.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle();
  if (!postulacion) redirect(`/postular/${token}?error=sesion`);

  return <PreguntasVoz preguntas={preguntasVoz} rutaTerminado={`/postular/${token}/terminado`} />;
}
