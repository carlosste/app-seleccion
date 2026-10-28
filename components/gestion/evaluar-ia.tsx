"use client";

import { useState, useTransition } from "react";
import { evaluarPostulacion } from "@/lib/gestion/evaluacion";

// Botón "Evaluar con IA". Se pide a mano para no gastar tokens en cada postulación que llega.
// "hayNuevo" indica si falta leer el CV o hay respuestas que la IA todavía no puntuó.
export function EvaluarIa({
  vacanteId,
  postulacionId,
  hayNuevo,
  yaEvaluada,
  enProceso,
}: {
  vacanteId: string;
  postulacionId: string;
  hayNuevo: boolean;
  yaEvaluada: boolean;
  enProceso: boolean;
}) {
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, iniciar] = useTransition();

  function evaluar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await evaluarPostulacion(vacanteId, postulacionId);
      setMensaje({ ok: r.ok, texto: r.mensaje });
    });
  }

  const deshabilitado = cargando || !enProceso || !hayNuevo;
  const ayuda = !enProceso
    ? "La postulación ya tiene una decisión final."
    : !hayNuevo
      ? "No hay nada nuevo: la hoja de vida ya se analizó y no hay respuestas nuevas."
      : "Lee la hoja de vida (una sola vez) y puntúa las respuestas con la rúbrica.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" className="btn btn-claro" onClick={evaluar} disabled={deshabilitado}>
        {cargando ? "Evaluando… (puede tardar unos segundos)" : yaEvaluada ? "Actualizar evaluación con IA" : "Evaluar con IA"}
      </button>
      <span className="texto-gris" style={{ fontSize: 12 }}>
        {ayuda}
      </span>
      {mensaje && (
        <div className={mensaje.ok ? "nota nota-az" : "nota nota-error"} role="status">
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
