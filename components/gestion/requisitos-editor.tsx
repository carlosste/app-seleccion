"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarRequisito, guardarRequisito, quitarRequisito } from "@/lib/gestion/acciones-configuracion";
import type { RequisitoVacante } from "@/lib/gestion/configuracion";
import type { Sugerencia } from "@/lib/gestion/sugerencias";

type Datos = { oferta: string; minimo: string };
type Resultado = { ok: boolean; mensaje?: string };

// Requisitos de la vacante: lo que pide la oferta (público) y el mínimo aceptable
// (interno). Cada cambio se guarda al salir del campo. El mínimo se ve transparente
// hasta que se enfoca.
export function RequisitosEditor({
  vacanteId,
  requisitos,
  tipos,
}: {
  vacanteId: string;
  requisitos: RequisitoVacante[];
  tipos: Sugerencia[];
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  function ejecutar(accion: () => Promise<Resultado>) {
    empezar(async () => {
      const r = await accion();
      setAviso(r.ok ? null : (r.mensaje ?? "No pudimos guardar el cambio."));
      router.refresh();
    });
  }

  function agregar(datos: Datos) {
    setAbierto(false);
    ejecutar(() => agregarRequisito(vacanteId, datos));
  }

  return (
    <>
      {aviso && (
        <div className="nota nota-error" role="alert">
          {aviso}
        </div>
      )}
      <div className="tabla-caja">
        <table style={{ minWidth: 640 }}>
          <thead>
            <tr>
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
            {requisitos.length === 0 && (
              <tr>
                <td colSpan={3} className="texto-gris">
                  Aún no hay requisitos. Agrega el primero abajo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex" style={{ gap: 10, position: "relative" }}>
        <button type="button" className="btn btn-punto" disabled={pendiente} onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          + Agregar requisito
        </button>
        {abierto && (
          <div className="tarjeta" role="menu" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260, padding: 8 }}>
            {tipos.map((t) => (
              <button
                key={t.nombre}
                type="button"
                role="menuitem"
                className="btn-enlace"
                style={{ textAlign: "left", padding: "8px 10px" }}
                onClick={() => agregar({ oferta: t.oferta, minimo: t.minimo })}
              >
                {t.nombre}
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className="btn-enlace"
              style={{ textAlign: "left", padding: "8px 10px" }}
              onClick={() => agregar({ oferta: "", minimo: "" })}
            >
              Personalizado
            </button>
          </div>
        )}
      </div>
      <div className="nota nota-az">
        La IA lee el CV y aplica estos mínimos. Si no logra leer un dato, el CV pasa a &quot;Por revisar&quot; en vez de
        descartarse. La app no permite requisitos discriminatorios (edad máxima, género, estado civil).
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
  const [oferta, setOferta] = useState(requisito.oferta);
  const [minimo, setMinimo] = useState(requisito.minimo);
  const datos = { oferta, minimo };

  return (
    <tr>
      <td>
        <input
          className="inp"
          value={oferta}
          aria-label="Lo que pide la oferta"
          onChange={(e) => setOferta(e.target.value)}
          onBlur={() => onGuardar(datos)}
        />
      </td>
      <td>
        <input
          className="inp inp-resaltado transparente"
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
