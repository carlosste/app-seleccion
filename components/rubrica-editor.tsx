"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { agregarCriterio, cambiarPesoCriterio, guardarCriterio, quitarCriterio } from "@/lib/gestion/acciones-configuracion";
import type { CriterioVacante } from "@/lib/gestion/configuracion";

type Resultado = { ok: boolean; mensaje?: string };

// Rúbrica editable. Cambiar un peso reparte la diferencia entre los demás criterios
// para que el total siga en 100. Sin límite de criterios.
export function RubricaEditor({ vacanteId, criterios }: { vacanteId: string; criterios: CriterioVacante[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const total = criterios.reduce((suma, c) => suma + c.peso, 0);

  function ejecutar(accion: () => Promise<Resultado>) {
    empezar(async () => {
      const r = await accion();
      setAviso(r.ok ? null : (r.mensaje ?? "No pudimos guardar el cambio."));
      router.refresh();
    });
  }

  return (
    <>
      {aviso && (
        <div className="nota nota-error" role="alert">
          {aviso}
        </div>
      )}
      {criterios.map((c) => (
        <FilaCriterio
          key={c.id}
          criterio={c}
          deshabilitado={pendiente}
          onGuardar={(nombre, descripcion) => ejecutar(() => guardarCriterio(c.id, vacanteId, nombre, descripcion))}
          onPeso={(peso) => ejecutar(() => cambiarPesoCriterio(c.id, vacanteId, peso))}
          onQuitar={() => ejecutar(() => quitarCriterio(c.id, vacanteId))}
        />
      ))}
      <div className="flex" style={{ justifyContent: "space-between" }}>
        <button
          type="button"
          className="btn btn-punto"
          disabled={pendiente}
          onClick={() => ejecutar(() => agregarCriterio(vacanteId, "Nuevo criterio", ""))}
        >
          + Agregar criterio
        </button>
        <b className={total === 100 || criterios.length === 0 ? "total-ok" : "total-mal"}>Total: {total}%</b>
      </div>
    </>
  );
}

function FilaCriterio({
  criterio,
  deshabilitado,
  onGuardar,
  onPeso,
  onQuitar,
}: {
  criterio: CriterioVacante;
  deshabilitado: boolean;
  onGuardar: (nombre: string, descripcion: string) => void;
  onPeso: (peso: number) => void;
  onQuitar: () => void;
}) {
  const [nombre, setNombre] = useState(criterio.nombre);
  const [descripcion, setDescripcion] = useState(criterio.descripcion);
  const [peso, setPeso] = useState(String(criterio.peso));

  // Si otro cambio reparte los pesos, el campo muestra el valor nuevo.
  useEffect(() => setPeso(String(criterio.peso)), [criterio.peso]);

  function confirmarPeso() {
    const valor = Number(peso);
    if (valor !== criterio.peso) onPeso(valor);
  }

  return (
    <div className="crit">
      <div className="crit-texto" style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <input
          className="inp"
          value={nombre}
          aria-label="Nombre del criterio"
          disabled={deshabilitado}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => onGuardar(nombre, descripcion)}
        />
        <input
          className="inp"
          value={descripcion}
          aria-label="Descripción del criterio"
          placeholder="Qué evalúa este criterio"
          disabled={deshabilitado}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={() => onGuardar(nombre, descripcion)}
        />
      </div>
      <label className="flex">
        <input
          className="peso"
          value={peso}
          inputMode="numeric"
          aria-label={`Peso de ${criterio.nombre}`}
          disabled={deshabilitado}
          onChange={(e) => setPeso(e.target.value)}
          onBlur={confirmarPeso}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        %
      </label>
      <button type="button" className="btn-enlace" disabled={deshabilitado} onClick={onQuitar}>
        Quitar
      </button>
    </div>
  );
}
