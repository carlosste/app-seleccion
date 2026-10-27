"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarEtapa, quitarEtapa } from "@/lib/gestion/acciones-configuracion";
import type { EtapaVacante } from "@/lib/gestion/configuracion";

const TIPOS = [
  { valor: "texto", titulo: "Preguntas por texto", detalle: "Cuestionario · a ciegas" },
  { valor: "voz", titulo: "Preguntas por voz", detalle: "Cuestionario · a ciegas" },
  { valor: "entrevista", titulo: "Entrevista", detalle: "Con entrevistador · grabada" },
  { valor: "cv", titulo: "Revisión de CV", detalle: "Automática · requisitos mínimos" },
];

// Etapas del proceso. La empresa las agrega, quita y puede repetir un tipo.
export function EtapasEditor({ vacanteId, etapas }: { vacanteId: string; etapas: EtapaVacante[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [tipo, setTipo] = useState(TIPOS[0].valor);
  const [aviso, setAviso] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje?: string }>) {
    empezar(async () => {
      const r = await accion();
      setAviso(r.ok ? null : (r.mensaje ?? "No pudimos guardar el cambio."));
      router.refresh();
    });
  }

  const titulo = (valor: string) => TIPOS.find((t) => t.valor === valor)?.titulo ?? valor;

  return (
    <>
      {aviso && (
        <div className="nota nota-error" role="alert">
          {aviso}
        </div>
      )}
      <div className="flex" style={{ gap: 10, flexWrap: "wrap" }}>
        {etapas.map((e, i) => (
          <div key={e.id} className="paso">
            <b>{i + 1}</b>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo(e.tipo)}</div>
              <button
                type="button"
                className="btn-enlace"
                style={{ fontSize: 12 }}
                disabled={pendiente}
                onClick={() => ejecutar(() => quitarEtapa(e.id, vacanteId))}
              >
                Quitar etapa
              </button>
            </div>
          </div>
        ))}
        {etapas.length === 0 && <span className="texto-gris">Esta vacante aún no tiene etapas.</span>}
      </div>

      <div className="flex" style={{ gap: 10 }}>
        <select className="inp" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de etapa">
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.titulo}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-punto" disabled={pendiente} onClick={() => ejecutar(() => agregarEtapa(vacanteId, tipo))}>
          + Agregar etapa
        </button>
      </div>
    </>
  );
}
