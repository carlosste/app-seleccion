import { Barra } from "@/components/barra";
import type { EvaluacionEtapa } from "@/lib/gestion/tipos-evaluacion";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// Análisis de la IA de UNA etapa: se calcula solo con las respuestas de esa etapa.
export function EvaluacionEtapaVista({ evaluacion }: { evaluacion: EvaluacionEtapa }) {
  return (
    <div className="tarjeta" style={{ background: "var(--fondo, #F6F7F9)", gap: 10 }}>
      <div className="fila-puntaje" style={{ fontSize: 15, alignItems: "baseline" }}>
        <b>Análisis de la IA en esta etapa</b>
        <b style={{ fontSize: 20 }}>
          {evaluacion.ajuste ?? "—"}
          <span style={{ fontSize: 13, color: "var(--gris)", fontWeight: 500 }}>/100</span>
        </b>
      </div>
      {evaluacion.criterios.map((c) => (
        <div key={c.nombre}>
          <div className="fila-puntaje">
            <span>
              {c.nombre} <span className="texto-gris">({c.peso}%)</span>
            </span>
            <span className="num">{c.puntaje ?? "—"}</span>
          </div>
          <Barra valor={c.puntaje ?? 0} fina />
          <div className="evidencia">{c.evidencia}</div>
        </div>
      ))}
      <div style={{ fontSize: 13, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6 }}>
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
        <span className="texto-gris" style={{ fontSize: 12 }}>
          Con {evaluacion.respuestasEvaluadas} respuestas · {fecha(evaluacion.fecha)} · “—” es sin evidencia: no resta.
        </span>
      </div>
    </div>
  );
}
