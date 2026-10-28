"use client";

import { useEffect, useState } from "react";

// CV original en cualquier etapa (decisión de Carlos, 2026-10-28): gestión humana lo necesita
// a la mano. Se ve dentro de la página y se puede descargar. La ruta solo lo entrega a personal
// de la misma empresa y deja cada vista y descarga en registro_actividad.
export function VisorCv({ postulacionId, numero, tieneCv }: { postulacionId: string; numero: string; tieneCv: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = `/api/gestion/cv/${postulacionId}`;

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEsc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", cerrarConEsc);
    return () => window.removeEventListener("keydown", cerrarConEsc);
  }, [abierto]);

  if (!tieneCv) {
    return (
      <button type="button" className="btn btn-sec btn-chico" disabled title="Esta postulación no tiene hoja de vida.">
        Sin CV
      </button>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-sec btn-chico" onClick={() => setAbierto(true)}>
        Ver CV
      </button>
      <a href={`${ruta}?descargar=1`} className="btn btn-sec btn-chico" download={`candidato-${numero}.pdf`}>
        Descargar CV
      </a>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Hoja de vida del candidato #${numero}`}
          onClick={() => setAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(17, 24, 39, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="tarjeta"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(960px, 100%)", height: "min(90vh, 1100px)", padding: 12, gap: 8 }}
          >
            <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <b>Hoja de vida · Candidato #{numero}</b>
              <div className="flex" style={{ gap: 8 }}>
                <a href={`${ruta}?descargar=1`} className="btn btn-sec btn-chico" download={`candidato-${numero}.pdf`}>
                  Descargar
                </a>
                <button type="button" className="btn btn-chico" onClick={() => setAbierto(false)}>
                  Cerrar
                </button>
              </div>
            </div>
            <iframe src={ruta} title={`CV del candidato #${numero}`} style={{ flex: 1, width: "100%", border: 0, borderRadius: 8 }} />
          </div>
        </div>
      )}
    </>
  );
}
