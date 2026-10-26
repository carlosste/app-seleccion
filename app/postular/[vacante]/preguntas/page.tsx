import { notFound } from "next/navigation";
import { obtenerVacante, preguntasVoz } from "@/lib/datos-prueba";
import { PreguntasVoz } from "@/components/preguntas-voz";

// 3 · Preguntas de la etapa, una por una. Son iguales para todos los postulantes del cargo.
export default async function Preguntas({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: id } = await params;
  const vacante = obtenerVacante(id);
  if (!vacante) notFound();

  return <PreguntasVoz preguntas={preguntasVoz} rutaTerminado={`/postular/${vacante.id}/terminado`} />;
}
