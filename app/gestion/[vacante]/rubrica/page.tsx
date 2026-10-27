import { RubricaEditor } from "@/components/rubrica-editor";
import { sembrarRubricaSiFalta } from "@/lib/gestion/acciones-configuracion";
import { listarCriterios } from "@/lib/gestion/configuracion";

// C · Rúbrica: criterios con peso. La IA puntúa con esta rúbrica y nunca evalúa rasgos personales.
export default async function Rubrica({ params }: PageProps<"/gestion/[vacante]/rubrica">) {
  const { vacante: id } = await params;
  await sembrarRubricaSiFalta(id);
  const criterios = await listarCriterios(id);

  return (
    <div className="dos">
      <section className="tarjeta ancho">
        <h2 style={{ fontSize: 18 }}>Criterios de evaluación</h2>
        <RubricaEditor vacanteId={id} criterios={criterios} />
      </section>

      <aside className="lado">
        <div className="nota nota-na" style={{ flexDirection: "column", gap: 6, padding: 18 }}>
          <b style={{ fontSize: 15 }}>La IA nunca evalúa</b>
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>
            Acento, edad, género, tono de voz ni ningún rasgo personal. Tampoco descarta ni elige al mejor.
          </span>
        </div>
      </aside>
    </div>
  );
}
