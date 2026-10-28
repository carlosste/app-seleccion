"use client";

import { useState } from "react";

// Copia el link público de la vacante (la ruta empieza con /postular/).
export function CopiarLink({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.origin + ruta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  // aria-live: el lector de pantalla anuncia "¡Copiado!" al cambiar el texto.
  return (
    <button type="button" className="btn btn-sec btn-chico" onClick={copiar} aria-live="polite">
      {copiado ? "¡Copiado!" : "Copiar link"}
    </button>
  );
}
