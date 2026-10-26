import { RubricaEditor } from "@/components/rubrica-editor";
import { criterios } from "@/lib/datos-prueba";

// C · Rúbrica: criterios con peso. La IA puntúa con esta rúbrica y nunca evalúa rasgos personales.
export default function Rubrica() {
  return (
    <div className="dos">
      <section className="tarjeta ancho">
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18 }}>Criterios de evaluación</h2>
          <div className="flex">
            <button type="button" className="btn btn-sec btn-chico">
              Subir rúbrica en PDF
            </button>
            <button type="button" className="btn btn-sec btn-chico">
              Usar plantilla: cargo técnico
            </button>
          </div>
        </div>
        <RubricaEditor criterios={criterios} />
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
