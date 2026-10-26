import { preguntasVoz } from "@/lib/datos-prueba";
import { vacantePorToken } from "@/lib/vacante-publica";
import { PreguntasVoz } from "@/components/preguntas-voz";

// 3 · Preguntas de la etapa, una por una. Son iguales para todos los postulantes del cargo.
// Las preguntas siguen siendo de prueba hasta el bloque B.
export default async function Preguntas({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: token } = await params;
  await vacantePorToken(token);

  return <PreguntasVoz preguntas={preguntasVoz} rutaTerminado={`/postular/${token}/terminado`} />;
}
