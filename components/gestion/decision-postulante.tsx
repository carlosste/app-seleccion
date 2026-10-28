"use client";

import { useState, useTransition } from "react";
import { decidir } from "@/lib/gestion/decisiones";

// "Tu decisión": la IA no descarta en etapas de preguntas, decide gestión humana.
// Pide confirmación porque no se puede deshacer (las decisiones son filas nuevas, no ediciones).
// La confirmación va dentro de la tarjeta: window.confirm() congela la página mientras está abierto.
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
  const [porConfirmar, setPorConfirmar] = useState<"pasa" | "no_pasa" | null>(null);
  const [cargando, iniciar] = useTransition();

  if (estado !== "en_proceso") {
    return (
      <div className={estado === "seleccionada" ? "nota nota-az" : "nota nota-na"}>
        {estado === "seleccionada" ? "Seleccionado: superó todas las etapas." : "No continúa en el proceso."}
      </div>
    );
  }

  const textoPasa = siguienteEtapa ? `Pasa a ${siguienteEtapa}` : "Seleccionar";

  const pregunta =
    porConfirmar === "pasa"
      ? siguienteEtapa
        ? `¿Confirmas que pasa a "${siguienteEtapa}"?`
        : "¿Confirmas que queda seleccionado? Es la última etapa."
      : "¿Confirmas que no continúa en el proceso? No se puede deshacer.";

  function enviar(resultado: "pasa" | "no_pasa") {
    setPorConfirmar(null);
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
      {porConfirmar ? (
        <div className="nota nota-na" role="alertdialog" aria-label="Confirmar decisión" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>{pregunta}</b>
          <div className="flex" style={{ gap: 10 }}>
            <button type="button" className="btn btn-sec btn-ancho" onClick={() => setPorConfirmar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={porConfirmar === "pasa" ? "btn btn-verde btn-ancho" : "btn btn-ancho"}
              autoFocus
              onClick={() => enviar(porConfirmar)}
            >
              Sí, confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex" style={{ gap: 10 }}>
          <button type="button" className="btn btn-sec btn-ancho" disabled={!puedeDecidir || cargando} onClick={() => setPorConfirmar("no_pasa")}>
            No pasa
          </button>
          <button type="button" className="btn btn-verde btn-ancho" disabled={!puedeDecidir || cargando} onClick={() => setPorConfirmar("pasa")}>
            {cargando ? "Guardando…" : textoPasa}
          </button>
        </div>
      )}
      {mensaje && (
        <div className={mensaje.ok ? "nota nota-az" : "nota nota-error"} role="status">
          {mensaje.texto}
        </div>
      )}
    </>
  );
}
