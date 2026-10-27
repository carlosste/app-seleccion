"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarRequisito, guardarRequisito, quitarRequisito } from "@/lib/gestion/acciones-configuracion";
import type { RequisitoVacante } from "@/lib/gestion/configuracion";
import type { Sugerencia } from "@/lib/gestion/sugerencias";

type Datos = { nombre: string; oferta: string; minimo: string };
type Resultado = { ok: boolean; mensaje?: string };

// Requisitos de la vacante. Cada cambio se guarda al salir del campo. El mínimo es
// interno: se muestra borroso y se aclara al enfocarlo.
export function RequisitosEditor({
  vacanteId,
  requisitos,
  sugerencias,
}: {
  vacanteId: string;
  requisitos: RequisitoVacante[];
  sugerencias: Sugerencia[];
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

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
      <div className="tabla-caja">
        <table style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Requisito</th>
              <th>Lo que pide la oferta (público)</th>
              <th>Mínimo aceptable (interno)</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {requisitos.map((r) => (
              <FilaRequisito
                key={r.id}
                requisito={r}
                onGuardar={(datos) => ejecutar(() => guardarRequisito(r.id, vacanteId, datos))}
                onQuitar={() => ejecutar(() => quitarRequisito(r.id, vacanteId))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <b style={{ fontSize: 14 }}>Sugeridos para filtrar más rápido</b>
        <div className="flex">
          {sugerencias.map((s) => {
            const yaEsta = requisitos.some((r) => r.nombre === s.nombre);
            return (
              <button
                key={s.nombre}
                type="button"
                className="pill"
                disabled={yaEsta || pendiente}
                onClick={() => ejecutar(() => agregarRequisito(vacanteId, s))}
              >
                + <span className="borroso">{s.nombre}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="pill punto"
            disabled={pendiente}
            onClick={() => ejecutar(() => agregarRequisito(vacanteId, { nombre: "Nuevo requisito", oferta: "", minimo: "" }))}
          >
            + Requisito personalizado
          </button>
        </div>
        <div className="nota nota-az">
          La IA lee el CV y aplica estos mínimos. Si no logra leer un dato, el CV pasa a &quot;Por revisar&quot; en vez de
          descartarse. La app no permite requisitos discriminatorios (edad máxima, género, estado civil).
        </div>
      </div>
    </>
  );
}

function FilaRequisito({
  requisito,
  onGuardar,
  onQuitar,
}: {
  requisito: RequisitoVacante;
  onGuardar: (datos: Datos) => void;
  onQuitar: () => void;
}) {
  const [nombre, setNombre] = useState(requisito.nombre);
  const [oferta, setOferta] = useState(requisito.oferta);
  const [minimo, setMinimo] = useState(requisito.minimo);
  const datos = { nombre, oferta, minimo };

  return (
    <tr>
      <td>
        <input
          className="inp"
          value={nombre}
          aria-label="Nombre del requisito"
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => onGuardar(datos)}
        />
      </td>
      <td>
        <input
          className="inp"
          value={oferta}
          aria-label="Oferta"
          onChange={(e) => setOferta(e.target.value)}
          onBlur={() => onGuardar(datos)}
        />
      </td>
      <td>
        <input
          className="inp inp-resaltado borroso"
          value={minimo}
          aria-label="Mínimo aceptable"
          onChange={(e) => setMinimo(e.target.value)}
          onBlur={() => onGuardar(datos)}
        />
      </td>
      <td>
        <button type="button" className="btn-enlace" onClick={onQuitar}>
          Quitar
        </button>
      </td>
    </tr>
  );
}
