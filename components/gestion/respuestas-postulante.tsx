"use client";

import { useState } from "react";
import { EvaluacionEtapaVista } from "@/components/gestion/evaluacion-etapa";
import type { GrupoRespuestas } from "@/lib/gestion/datos";
import type { EvaluacionEtapa } from "@/lib/gestion/tipos-evaluacion";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// Una pestaña por cada etapa de preguntas de la vacante, con sus nombres y en su orden
// (las mismas que se configuran en Requisitos). Cada pestaña muestra las respuestas de esa
// etapa y el análisis de la IA de esa etapa, sin mezclar con las demás.
export function RespuestasPostulante({ grupos, evaluaciones }: { grupos: GrupoRespuestas[]; evaluaciones: EvaluacionEtapa[] }) {
  const respondidas = (g: GrupoRespuestas) => g.preguntas.filter((p) => p.respuesta != null).length;
  // Se abre la etapa más avanzada que ya tiene respuestas.
  const inicial = [...grupos].reverse().find((g) => respondidas(g) > 0)?.etapaId ?? grupos[0]?.etapaId;
  const [etapaId, setEtapaId] = useState(inicial);

  if (grupos.length === 0) return <span className="texto-gris">Esta vacante no tiene etapas de preguntas.</span>;
  const g = grupos.find((x) => x.etapaId === etapaId) ?? grupos[0];
  const evaluacion = evaluaciones.find((e) => e.etapaId === g.etapaId);

  return (
    <>
      <div className="flex" role="tablist" aria-label="Etapas de la vacante">
        {grupos.map((x, i) => (
          <button
            key={x.etapaId}
            type="button"
            role="tab"
            aria-selected={x.etapaId === g.etapaId}
            className={x.etapaId === g.etapaId ? "pill on" : "pill"}
            disabled={!x.alcanzada}
            title={x.alcanzada ? undefined : "Todavía no llega a esta etapa."}
            onClick={() => setEtapaId(x.etapaId)}
          >
            {i + 1}. {x.nombre} ({respondidas(x)}/{x.preguntas.length})
          </button>
        ))}
      </div>

      {g.preguntas.length === 0 && <span className="texto-gris">Esta etapa no tiene preguntas.</span>}
      {g.preguntas.map((p) => (
        <div key={p.numero} className="resp">
          <span className="etq">
            Pregunta {p.numero}
            {p.respondidaAt ? ` · respondida ${fecha(p.respondidaAt)}` : ""}
          </span>
          <b>{p.pregunta}</b>
          {p.respuesta != null ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{p.respuesta}</p>
          ) : (
            <p className="texto-gris">Sin responder todavía.</p>
          )}
        </div>
      ))}

      {evaluacion ? (
        <EvaluacionEtapaVista evaluacion={evaluacion} />
      ) : (
        respondidas(g) > 0 && (
          <span className="texto-gris">Esta etapa aún no tiene análisis de la IA. Usa “Evaluar con IA”.</span>
        )
      )}
    </>
  );
}
