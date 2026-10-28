"use client";

import { useState, useTransition } from "react";
import { decidir } from "@/lib/gestion/decisiones";

// "Tu decisión": la IA no descarta en etapas de preguntas, decide gestión humana.
// Pide confirmación porque no se puede deshacer (las decisiones son filas nuevas, no ediciones).
export function DecisionPostulante({
  vacanteId,
  postulacionId,
  estado,
  etapaActual,
  siguienteEtapa,
  puedeDecidir,
}: {
  vacanteId: string;
  postulacionId: string;
  estado: "en_proceso" | "descartada" | "seleccionada";
  etapaActual: string | null;
  siguienteEtapa: string | null;
  puedeDecidir: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, iniciar] = useTransition();

  if (estado !== "en_proceso") {
    return (
      <div className={estado === "seleccionada" ? "nota nota-az" : "nota nota-na"}>
        {estado === "seleccionada" ? "Seleccionado: superó todas las etapas." : "No continúa en el proceso."}
      </div>
    );
  }

  const textoPasa = siguienteEtapa ? `Pasa a ${siguienteEtapa}` : "Seleccionar";

  function enviar(resultado: "pasa" | "no_pasa") {
    const pregunta =
      resultado === "pasa"
        ? siguienteEtapa
          ? `¿Confirmas que pasa a "${siguienteEtapa}"?`
          : "¿Confirmas que queda seleccionado? Es la última etapa."
        : "¿Confirmas que no continúa en el proceso? No se puede deshacer.";
    if (!window.confirm(pregunta)) return;
    setMensaje(null);
    iniciar(async () => {
      const r = await decidir(vacanteId, postulacionId, resultado, motivo);
      setMensaje({ ok: r.ok, texto: r.mensaje });
      if (r.ok) setMotivo("");
    });
  }

  return (
    <>
      <span className="texto-gris">
        Etapa actual: <b>{etapaActual ?? "sin etapa"}</b>. La IA no descarta a nadie en las preguntas: decide gestión humana.
      </span>
      {!puedeDecidir && <span className="texto-gris">Solo gestión humana puede decidir. Tu rol es entrevistador.</span>}
      <div className="campo">
        <label htmlFor="motivo">Motivo (opcional, queda en el historial)</label>
        <textarea
          id="motivo"
          className="area"
          style={{ minHeight: 64 }}
          maxLength={500}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={!puedeDecidir || cargando}
        />
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <button type="button" className="btn btn-sec btn-ancho" disabled={!puedeDecidir || cargando} onClick={() => enviar("no_pasa")}>
          No pasa
        </button>
        <button type="button" className="btn btn-verde btn-ancho" disabled={!puedeDecidir || cargando} onClick={() => enviar("pasa")}>
          {cargando ? "Guardando…" : textoPasa}
        </button>
      </div>
      {mensaje && (
        <div className={mensaje.ok ? "nota nota-az" : "nota nota-error"} role="status">
          {mensaje.texto}
        </div>
      )}
    </>
  );
}
