import { RubricaEditor } from "@/components/rubrica-editor";
import { sembrarRubricaSiFalta } from "@/lib/gestion/acciones-configuracion";
import { listarCriterios } from "@/lib/gestion/configuracion";

// C · Rúbrica: criterios con peso. La IA puntúa con esta rúbrica y nunca evalúa rasgos personales.
// Pensada para alguien de gestión humana que no sabe de IA: primero cómo funciona en tres pasos,
// después los criterios, y al lado un ejemplo con el primer criterio real de la vacante.
export default async function Rubrica({ params }: PageProps<"/gestion/[vacante]/rubrica">) {
  const { vacante: id } = await params;
  await sembrarRubricaSiFalta(id);
  const criterios = await listarCriterios(id);
  const ejemplo = criterios[0];
  const aporte = ejemplo ? Math.round((ejemplo.peso * 80) / 100) : 0;

  return (
    <section className="bloque" aria-labelledby="h-rubrica">
      <div className="bloque__cabeza">
        <div>
          <h2 id="h-rubrica">Criterios de evaluación</h2>
          <p>Aquí decides qué debe mirar la IA en las respuestas de los postulantes y cuánto importa cada cosa.</p>
        </div>
      </div>

      <ol className="rubrica-pasos" aria-label="Cómo funciona la rúbrica">
        <li>
          <b>Qué mirar</b>
          <span>Cada criterio es algo que quieres ver en las respuestas, por ejemplo “Comunicación clara”.</span>
        </li>
        <li>
          <b>Cuánto importa</b>
          <span>La importancia de todos suma 100 %. Si subes uno, los demás bajan solos.</span>
        </li>
        <li>
          <b>Cómo califica la IA</b>
          <span>Da a cada criterio de 0 a 100, cita la frase que lo respalda y suma según la importancia.</span>
        </li>
      </ol>

      <div className="rubrica-marco">
        <div className="superficie superficie--relleno">
          <RubricaEditor vacanteId={id} criterios={criterios} />
        </div>
        <aside className="rubrica-lateral">
          {ejemplo && (
            <div className="rubrica-ejemplo">
              <b>Ejemplo</b>
              <span>
                “{ejemplo.nombre}” vale {ejemplo.peso} %. Si la IA le da 80 de 100 a un postulante, aporta{" "}
                <strong>{aporte} puntos</strong> a su ajuste total.
              </span>
            </div>
          )}
          <div className="nota-etica">
            <b>La IA nunca evalúa</b>
            <span>Acento, edad, género, tono de voz ni ningún rasgo personal. Tampoco descarta ni elige al mejor: la decisión es tuya.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
