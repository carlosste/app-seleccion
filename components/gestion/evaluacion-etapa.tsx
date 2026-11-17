import { Barra } from "@/components/barra";
import type { EvaluacionEtapa } from "@/lib/gestion/tipos-evaluacion";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// Análisis de la IA de UNA etapa: se calcula solo con las respuestas de esa etapa.
// Cada criterio muestra su puntaje, su barra y la cita que lo sostiene (la misma que aparece
// marcada en la respuesta, arriba).
export function EvaluacionEtapaVista({ evaluacion }: { evaluacion: EvaluacionEtapa }) {
  return (
    <div className="analisis-etapa">
      <div className="analisis-etapa__cabeza">
        <b>Análisis de la IA en esta etapa</b>
        <strong>
          {evaluacion.ajuste ?? "—"}
          <span>/100</span>
        </strong>
      </div>
      {evaluacion.sospecha && (
        <div className="nota nota-error" role="alert">
          <span>
            <b>Posible intento de manipular la evaluación:</b> revisa las respuestas a mano antes de usar este puntaje.
            {evaluacion.motivoSospecha && <> Motivo: {evaluacion.motivoSospecha}</>}
          </span>
        </div>
      )}
      {evaluacion.criterios.map((c) => (
        <div key={c.nombre} className="criterio">
          <div className="criterio__fila">
            <span>
              {c.nombre} <span className="texto-gris">· peso {c.peso}%</span>
            </span>
            <span className="num">{c.puntaje ?? "—"}</span>
          </div>
          <Barra valor={c.puntaje ?? 0} fina />
          <div className="criterio__cita">
            {c.evidencia}
            {c.verificada === false && (
              <span className="criterio__aviso"> · Evidencia no verificada: la cita no aparece en la respuesta.</span>
            )}
          </div>
        </div>
      ))}
      <div className="analisis-etapa__notas">
        {evaluacion.fortalezas && (
          <span>
            <b>Fortalezas:</b> {evaluacion.fortalezas}
          </span>
        )}
        {evaluacion.profundizar && (
          <span>
            <b>Para profundizar en la entrevista:</b> {evaluacion.profundizar}
          </span>
        )}
        <span className="texto-gris">
          Con {evaluacion.respuestasEvaluadas} respuestas · {fecha(evaluacion.fecha)} · “—” es sin evidencia: no resta.
        </span>
      </div>
    </div>
  );
}
