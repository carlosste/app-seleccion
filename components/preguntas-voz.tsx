"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderPregunta } from "@/app/postular/acciones";

export type PreguntaPendiente = {
  id: string;
  texto: string;
  tipoEtapa: "texto" | "voz";
  numero: number; // posición dentro de su etapa
  total: number;
};

const LARGO_MAXIMO = 3000;

// Cuestionario del postulante: una pregunta a la vez y cada respuesta se guarda al enviarla.
// Por ahora las preguntas de voz también se responden por escrito (decisión de Carlos,
// 2026-10-28); la grabación real queda para la siguiente fase.
export function PreguntasVoz({
  token,
  preguntas,
  rutaTerminado,
}: {
  token: string;
  preguntas: PreguntaPendiente[];
  rutaTerminado: string;
}) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const pregunta = preguntas[indice];
  const esUltima = indice === preguntas.length - 1;
  const titulo = pregunta.tipoEtapa === "voz" ? "Preguntas por voz" : "Preguntas por texto";
  const valido = texto.trim().length >= 2;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setError(null);
    iniciar(async () => {
      const r = await responderPregunta(token, pregunta.id, texto);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      if (r.fin || esUltima) {
        router.push(rutaTerminado);
        return;
      }
      setIndice((i) => i + 1);
      setTexto("");
    });
  }

  return (
    <>
      <div className="progreso">
        <div className="progreso-texto">
          <b>{titulo}</b>
          <span className="texto-gris">
            Pregunta {pregunta.numero} de {pregunta.total}
          </span>
        </div>
        <div className="barra barra-fina">
          <div style={{ width: `${(pregunta.numero / pregunta.total) * 100}%` }} />
        </div>
      </div>

      <form className="contenido" onSubmit={enviar}>
        <div className="tarjeta pregunta">
          <span className="etq">Pregunta</span>
          <p>{pregunta.texto}</p>
          {pregunta.tipoEtapa === "voz" && (
            <span className="texto-gris">Por ahora esta pregunta se responde por escrito.</span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="respuesta-texto">Tu respuesta</label>
          <textarea
            id="respuesta-texto"
            className="area"
            placeholder="Escribe tu respuesta aquí"
            value={texto}
            maxLength={LARGO_MAXIMO}
            onChange={(e) => setTexto(e.target.value)}
            disabled={enviando}
          />
          <span className="texto-gris" style={{ fontSize: 12, textAlign: "right" }}>
            {texto.length} / {LARGO_MAXIMO}
          </span>
        </div>

        {error && (
          <div className="nota nota-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn" disabled={!valido || enviando}>
          {enviando ? "Guardando…" : esUltima ? "Enviar y terminar" : "Enviar y seguir"}
        </button>
        <span className="texto-gris centrado" style={{ fontSize: 12 }}>
          Cada respuesta se guarda al enviarla. Si sales, al volver sigues donde ibas.
        </span>
      </form>
    </>
  );
}
