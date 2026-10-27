"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarEtapa, moverEtapa, quitarEtapa, renombrarEtapa } from "@/lib/gestion/acciones-configuracion";
import type { EtapaVacante } from "@/lib/gestion/configuracion";

const TIPOS = [
  { valor: "texto", titulo: "Preguntas por texto" },
  { valor: "voz", titulo: "Preguntas por voz" },
  { valor: "entrevista", titulo: "Entrevista" },
  { valor: "cv", titulo: "Revisión de CV" },
];

const titulo = (valor: string) => TIPOS.find((t) => t.valor === valor)?.titulo ?? valor;

type Resultado = { ok: boolean; mensaje?: string };

// Etapas del proceso: se nombran, se ordenan con las flechas y se quitan. Un tipo puede repetirse.
export function EtapasEditor({ vacanteId, etapas }: { vacanteId: string; etapas: EtapaVacante[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [tipo, setTipo] = useState(TIPOS[0].valor);
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

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {etapas.map((e, i) => (
          <FilaEtapa
            key={e.id}
            etapa={e}
            posicion={i + 1}
            esPrimera={i === 0}
            esUltima={i === etapas.length - 1}
            deshabilitado={pendiente}
            onRenombrar={(nombre) => ejecutar(() => renombrarEtapa(e.id, vacanteId, nombre))}
            onMover={(direccion) => ejecutar(() => moverEtapa(e.id, vacanteId, direccion))}
            onQuitar={() => ejecutar(() => quitarEtapa(e.id, vacanteId))}
          />
        ))}
      </ol>
      {etapas.length === 0 && <span className="texto-gris">Esta vacante aún no tiene etapas.</span>}

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

function FilaEtapa({
  etapa,
  posicion,
  esPrimera,
  esUltima,
  deshabilitado,
  onRenombrar,
  onMover,
  onQuitar,
}: {
  etapa: EtapaVacante;
  posicion: number;
  esPrimera: boolean;
  esUltima: boolean;
  deshabilitado: boolean;
  onRenombrar: (nombre: string) => void;
  onMover: (direccion: "subir" | "bajar") => void;
  onQuitar: () => void;
}) {
  const [nombre, setNombre] = useState(etapa.nombre ?? "");

  return (
    <li className="paso" style={{ alignItems: "center", gap: 12 }}>
      <b>{posicion}</b>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <input
          className="inp"
          value={nombre}
          placeholder={titulo(etapa.tipo)}
          aria-label={`Nombre de la etapa ${posicion}`}
          disabled={deshabilitado}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => onRenombrar(nombre)}
        />
        <span className="texto-gris" style={{ fontSize: 12 }}>
          {titulo(etapa.tipo)}
        </span>
      </div>
      <div className="flex" style={{ gap: 6 }}>
        <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado || esPrimera} onClick={() => onMover("subir")} aria-label="Subir etapa">
          ↑
        </button>
        <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado || esUltima} onClick={() => onMover("bajar")} aria-label="Bajar etapa">
          ↓
        </button>
        <button type="button" className="btn-enlace" disabled={deshabilitado} onClick={onQuitar}>
          Quitar
        </button>
      </div>
    </li>
  );
}
