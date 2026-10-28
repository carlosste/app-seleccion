"use client";

import { useState, useTransition } from "react";
import { cerrarVacante, eliminarVacante } from "@/lib/gestion/vacantes";

// Quitar una vacante de la lista. Sin postulantes se elimina; con postulantes solo se
// cierra (deja de recibir y se oculta) para no borrar datos de nadie. Decisión de Carlos,
// 2026-10-28. La confirmación va dentro de la tarjeta, sin window.confirm.
export function QuitarVacante({ id, cargo, postulados }: { id: string; cargo: string; postulados: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, iniciar] = useTransition();
  const eliminar = postulados === 0;

  function quitar() {
    setError(null);
    iniciar(async () => {
      const r = eliminar ? await eliminarVacante(id) : await cerrarVacante(id);
      if (!r.ok) {
        setError(r.mensaje);
        setConfirmando(false);
      }
    });
  }

  if (!confirmando) {
    return (
      <>
        <button
          type="button"
          className="btn-enlace"
          style={{ alignSelf: "flex-start", color: "var(--naranja)" }}
          onClick={() => setConfirmando(true)}
        >
          {eliminar ? "Eliminar vacante" : "Cerrar vacante"}
        </button>
        {error && (
          <div className="nota nota-error" role="alert">
            {error}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="nota nota-na" role="alertdialog" aria-label={`Confirmar: ${cargo}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span>
        {eliminar ? (
          <>
            <b>¿Eliminar “{cargo}”?</b> Se borran sus requisitos, etapas, preguntas y rúbrica. No se puede deshacer.
          </>
        ) : (
          <>
            <b>¿Cerrar “{cargo}”?</b> Tiene {postulados.toLocaleString("es-CO")} postulante{postulados === 1 ? "" : "s"}, así que no se
            borra: deja de recibir postulaciones y sale de esta lista. Sus datos se conservan.
          </>
        )}
      </span>
      <div className="flex" style={{ gap: 10 }}>
        <button type="button" className="btn btn-sec btn-chico" disabled={cargando} onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
        <button type="button" className="btn btn-chico" autoFocus disabled={cargando} onClick={quitar}>
          {cargando ? "Un momento…" : eliminar ? "Sí, eliminar" : "Sí, cerrar"}
        </button>
      </div>
    </div>
  );
}
