"use client";

import { useFormStatus } from "react-dom";

// Botón de envío con estado de carga. `cargando` permite forzarlo desde fuera
// (formularios que llaman a la acción con startTransition).
export function BotonEnviar({
  texto,
  textoCargando,
  cargando,
}: {
  texto: string;
  textoCargando: string;
  cargando?: boolean;
}) {
  const { pending } = useFormStatus();
  const ocupado = cargando ?? pending;
  return (
    <button type="submit" className="btn btn-grande" disabled={ocupado} aria-busy={ocupado}>
      {ocupado && <span className="girando" aria-hidden="true" />}
      {ocupado ? textoCargando : texto}
    </button>
  );
}
