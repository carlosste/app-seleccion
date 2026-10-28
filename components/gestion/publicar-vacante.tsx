"use client";

import { useActionState } from "react";
import { CopiarLink } from "@/components/copiar-link";
import { publicarInicial } from "@/lib/gestion/estados";
import { publicarVacante } from "@/lib/gestion/vacantes";

// Estado de publicación de la vacante. En borrador ofrece publicarla; ya abierta,
// muestra el link público para copiarlo y mandárselo a los postulantes.
export function PublicarVacante({ id, estado, enlaceToken }: { id: string; estado: string; enlaceToken: string }) {
  const [resultado, accion, cargando] = useActionState(publicarVacante, publicarInicial);

  if (estado === "abierta") {
    return (
      <div className="tarjeta flex" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <b>Vacante publicada</b>
          <div className="texto-gris" style={{ fontSize: 14 }}>
            Los postulantes entran con este link: /postular/{enlaceToken}
          </div>
        </div>
        <CopiarLink ruta={`/postular/${enlaceToken}`} />
      </div>
    );
  }

  if (estado !== "borrador") return null;

  return (
    <form action={accion} className="tarjeta flex" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <input type="hidden" name="id" value={id} />
      <div>
        <b>Esta vacante está en borrador</b>
        <div className="texto-gris" style={{ fontSize: 14 }}>
          Publícala para generar su link de postulación. Al publicar, las preguntas de la primera etapa quedan fijas
          para que todos respondan las mismas.
        </div>
        {resultado.estado === "error" && (
          <div className="nota nota-error" role="alert">
            {resultado.mensaje}
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-chico" disabled={cargando}>
        {cargando ? "Publicando…" : "Publicar vacante"}
      </button>
    </form>
  );
}
