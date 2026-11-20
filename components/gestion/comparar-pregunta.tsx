"use client";

import { useId, useState, useTransition } from "react";
import { compararPerfiles } from "@/lib/gestion/comparar";
import type { Cercania, ResultadoComparacion } from "@/lib/gestion/calificacion-ia";

const LARGO = 500;

const SUGERENCIAS = [
  "¿Qué puntos fuertes y débiles tiene cada uno para este cargo?",
  "¿Cuál se acerca más al cargo y cuál está más alejado, y por qué?",
  "¿Qué le preguntarías a cada uno en una segunda entrevista?",
  "¿Quién muestra más experiencia práctica con ejemplos concretos?",
];

const CERCANIA: Record<Cercania, { texto: string; clase: string }> = {
  alta: { texto: "Cercanía al cargo: alta", clase: "chip-estado chip-estado--ok" },
  media: { texto: "Cercanía al cargo: media", clase: "chip-estado chip-estado--revisar" },
  baja: { texto: "Cercanía al cargo: baja", clase: "chip-estado chip-estado--no" },
  sin_datos: { texto: "Faltan evaluaciones", clase: "chip-estado chip-estado--neutro" },
};

// Pregunta libre sobre los perfiles elegidos (2026-11-19). La respuesta no se guarda: si sales de
// la página, se pierde. La IA compara con lo ya evaluado y no dice a quién contratar.
export function CompararPregunta({ vacanteId, numeros }: { vacanteId: string; numeros: string[] }) {
  const id = useId();
  const [pregunta, setPregunta] = useState("");
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function preguntar(texto: string) {
    const q = texto.trim();
    if (q.length < 5 || pendiente) return;
    setError(null);
    empezar(async () => {
      const r = await compararPerfiles(vacanteId, numeros.join(","), q);
      if (r.ok) setResultado(r.resultado);
      else setError(r.mensaje);
    });
  }

  return (
    <section className="superficie superficie--relleno comparar-pregunta" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`}>Pregúntale a la IA sobre estos perfiles</h2>
      <p className="texto-gris">
        Responde con lo que ya se evaluó de cada uno (hoja de vida, etapas y entrevista). No evalúa rasgos personales ni decide
        por ti. La respuesta no se guarda.
      </p>

      <div className="comparar-pregunta__sugerencias" role="group" aria-label="Preguntas sugeridas">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            type="button"
            className="filtro-etapas__chip"
            disabled={pendiente}
            onClick={() => {
              setPregunta(s);
              preguntar(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="campo"
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(pregunta);
        }}
      >
        <label htmlFor={`${id}-pregunta`}>O escribe tu pregunta</label>
        <textarea
          id={`${id}-pregunta`}
          className="area comparar-pregunta__campo"
          value={pregunta}
          maxLength={LARGO}
          placeholder="Ej.: ¿Cuál explica mejor cómo resolvió un problema con un cliente?"
          disabled={pendiente}
          onChange={(e) => setPregunta(e.target.value)}
        />
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <span className="texto-gris">
            {pregunta.length} / {LARGO}
          </span>
          <button type="submit" className="btn btn-chico" disabled={pendiente || pregunta.trim().length < 5}>
            {pendiente ? "Comparando…" : "Preguntar"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error && (
          <div className="nota nota-error" role="alert">
            {error}
          </div>
        )}
        {resultado && !pendiente && (
          <div className="comparar-respuesta">
            <p className="comparar-respuesta__texto">{resultado.respuesta}</p>
            <div className="comparar-respuesta__perfiles">
              {resultado.perfiles.map((p) => (
                <div key={p.numero} className="comparar-respuesta__perfil">
                  <div className="flex" style={{ justifyContent: "space-between" }}>
                    <b>Candidato #{p.numero}</b>
                    <span className={CERCANIA[p.cercania].clase}>{CERCANIA[p.cercania].texto}</span>
                  </div>
                  {p.motivo && <span className="texto-gris">{p.motivo}</span>}
                  <ul className="comparar-perfil__lista">
                    {p.fortalezas.map((f) => (
                      <li key={f} data-tipo="mas">
                        {f}
                      </li>
                    ))}
                    {p.debilidades.map((f) => (
                      <li key={f} data-tipo="menos">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {resultado.faltan && (
              <span className="texto-gris">
                <b>Faltan datos:</b> {resultado.faltan}
              </span>
            )}
            <span className="texto-gris">La IA ordena por evidencia, no decide. La decisión es tuya.</span>
          </div>
        )}
      </div>
    </section>
  );
}
