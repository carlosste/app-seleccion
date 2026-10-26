"use client";

import { useState } from "react";
import type { Criterio } from "@/lib/datos-prueba";

// Los pesos se editan aquí; el total debe sumar 100 para poder guardar.
export function RubricaEditor({ criterios }: { criterios: Criterio[] }) {
  const [pesos, setPesos] = useState(criterios.map((c) => String(c.peso)));
  const total = pesos.reduce((suma, p) => suma + (Number(p) || 0), 0);

  function cambiarPeso(indice: number, valor: string) {
    setPesos(pesos.map((p, i) => (i === indice ? valor : p)));
  }

  return (
    <>
      {criterios.map((c, i) => (
        <div key={c.nombre} className="crit">
          <div className="crit-texto">
            <div className="flex">
              <b>{c.nombre}</b>
              {c.esencial && <span className="chip">Esencial</span>}
            </div>
            <small>{c.descripcion}</small>
          </div>
          <label className="flex">
            <input
              className="peso"
              value={pesos[i]}
              inputMode="numeric"
              aria-label={`Peso de ${c.nombre}`}
              onChange={(e) => cambiarPeso(i, e.target.value)}
            />
            %
          </label>
        </div>
      ))}
      <div className="flex" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-punto">
          + Agregar criterio
        </button>
        <b className={total === 100 ? "total-ok" : "total-mal"}>Total: {total}%</b>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn" disabled={total !== 100}>
          Guardar rúbrica
        </button>
      </div>
    </>
  );
}
