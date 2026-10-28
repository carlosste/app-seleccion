"use client";

import { useState } from "react";
import type { GrupoRespuestas } from "@/lib/gestion/datos";

const PESTANAS = [
  { tipo: "texto", texto: "Preguntas por texto" },
  { tipo: "voz", texto: "Preguntas por voz" },
] as const;

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// Respuestas del postulante por tipo de etapa. Muestra también las preguntas sin responder,
// para que gestión humana vea si completó la etapa.
export function RespuestasPostulante({ grupos }: { grupos: GrupoRespuestas[] }) {
  const respondidas = (tipo: string) =>
    grupos.filter((g) => g.tipo === tipo).reduce((n, g) => n + g.preguntas.filter((p) => p.respuesta != null).length, 0);
  const existe = (tipo: string) => grupos.some((g) => g.tipo === tipo);
  const inicial = PESTANAS.find((p) => respondidas(p.tipo) > 0)?.tipo ?? PESTANAS.find((p) => existe(p.tipo))?.tipo ?? "texto";
  const [tipo, setTipo] = useState<"texto" | "voz">(inicial);

  const visibles = grupos.filter((g) => g.tipo === tipo);

  return (
    <>
      <div className="flex" role="tablist" aria-label="Tipo de preguntas">
        {PESTANAS.map((p) => (
          <button
            key={p.tipo}
            type="button"
            role="tab"
            aria-selected={tipo === p.tipo}
            className={tipo === p.tipo ? "pill on" : "pill"}
            disabled={!existe(p.tipo)}
            title={existe(p.tipo) ? undefined : "Esta vacante no tiene etapa de este tipo."}
            onClick={() => setTipo(p.tipo)}
          >
            {p.texto} ({respondidas(p.tipo)})
          </button>
        ))}
      </div>

      {visibles.length === 0 && <span className="texto-gris">Esta vacante no tiene etapa de este tipo.</span>}

      {visibles.map((g) => (
        <div key={g.etapaId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {visibles.length > 1 && <b style={{ fontSize: 14, marginTop: 8 }}>{g.nombre}</b>}
          {!g.alcanzada && <span className="texto-gris">Todavía no llega a esta etapa.</span>}
          {g.alcanzada && g.preguntas.length === 0 && <span className="texto-gris">Esta etapa no tiene preguntas.</span>}
          {g.alcanzada &&
            g.preguntas.map((p) => (
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
        </div>
      ))}
    </>
  );
}
