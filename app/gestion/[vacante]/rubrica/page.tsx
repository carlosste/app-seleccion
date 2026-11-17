import { RubricaEditor } from "@/components/rubrica-editor";
import { sembrarRubricaSiFalta } from "@/lib/gestion/acciones-configuracion";
import { listarCriterios } from "@/lib/gestion/configuracion";

// C · Rúbrica: criterios con peso. La IA puntúa con esta rúbrica y nunca evalúa rasgos personales.
export default async function Rubrica({ params }: PageProps<"/gestion/[vacante]/rubrica">) {
  const { vacante: id } = await params;
  await sembrarRubricaSiFalta(id);
  const criterios = await listarCriterios(id);

  return (
    <section className="bloque" aria-labelledby="h-rubrica">
      <div className="bloque__cabeza">
        <div>
          <h2 id="h-rubrica">Criterios de evaluación</h2>
          <p>La IA puntúa cada etapa con estos criterios y cita la frase que sostiene cada puntaje. Los pesos suman 100.</p>
        </div>
      </div>
      <div className="rubrica-marco">
        <div className="superficie superficie--relleno">
          <RubricaEditor vacanteId={id} criterios={criterios} />
        </div>
        <aside className="nota-etica">
          <b>La IA nunca evalúa</b>
          <span>Acento, edad, género, tono de voz ni ningún rasgo personal. Tampoco descarta ni elige al mejor.</span>
        </aside>
      </div>
    </section>
  );
}
