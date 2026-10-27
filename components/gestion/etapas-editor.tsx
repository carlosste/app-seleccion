"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarEtapa, moverEtapa, quitarEtapa, renombrarEtapa } from "@/lib/gestion/acciones-configuracion";
import type { EtapaVacante, PreguntaVacante } from "@/lib/gestion/configuracion";
import { generarPreguntas, guardarPregunta, quitarPregunta } from "@/lib/gestion/preguntas";

const TIPOS = [
  { valor: "texto", titulo: "Preguntas por texto" },
  { valor: "voz", titulo: "Preguntas por voz" },
  { valor: "entrevista", titulo: "Entrevista" },
  { valor: "cv", titulo: "Revisión de CV" },
];

const titulo = (valor: string) => TIPOS.find((t) => t.valor === valor)?.titulo ?? valor;

type Resultado = { ok: boolean; mensaje?: string };

// Etapas del proceso: se nombran, se ordenan con las flechas y se quitan. Cada etapa
// (salvo la revisión de CV) tiene sus preguntas: se generan con IA y se pueden editar o quitar.
export function EtapasEditor({
  vacanteId,
  etapas,
  preguntas,
}: {
  vacanteId: string;
  etapas: EtapaVacante[];
  preguntas: PreguntaVacante[];
}) {
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
            preguntas={preguntas.filter((p) => p.etapaId === e.id)}
            onRenombrar={(nombre) => ejecutar(() => renombrarEtapa(e.id, vacanteId, nombre))}
            onMover={(direccion) => ejecutar(() => moverEtapa(e.id, vacanteId, direccion))}
            onQuitar={() => ejecutar(() => quitarEtapa(e.id, vacanteId))}
            onGenerar={() => ejecutar(() => generarPreguntas(vacanteId, e.id))}
            onGuardarPregunta={(id, texto) => ejecutar(() => guardarPregunta(id, vacanteId, texto))}
            onQuitarPregunta={(id) => ejecutar(() => quitarPregunta(id, vacanteId))}
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
      <span className="texto-gris" style={{ fontSize: 13 }}>
        Revisa el orden y los nombres de las etapas antes de generar sus preguntas.
      </span>
    </>
  );
}

function FilaEtapa({
  etapa,
  posicion,
  esPrimera,
  esUltima,
  deshabilitado,
  preguntas,
  onRenombrar,
  onMover,
  onQuitar,
  onGenerar,
  onGuardarPregunta,
  onQuitarPregunta,
}: {
  etapa: EtapaVacante;
  posicion: number;
  esPrimera: boolean;
  esUltima: boolean;
  deshabilitado: boolean;
  preguntas: PreguntaVacante[];
  onRenombrar: (nombre: string) => void;
  onMover: (direccion: "subir" | "bajar") => void;
  onQuitar: () => void;
  onGenerar: () => void;
  onGuardarPregunta: (id: string, texto: string) => void;
  onQuitarPregunta: (id: string) => void;
}) {
  const [nombre, setNombre] = useState(etapa.nombre ?? "");

  return (
    <li className="paso" style={{ flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <b>{posicion}</b>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 220 }}>
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

      {etapa.tipo !== "cv" && (
        <details style={{ width: "100%" }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Preguntas ({preguntas.length})</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {preguntas.map((p, i) => (
              <FilaPregunta
                key={p.id}
                numero={i + 1}
                pregunta={p}
                deshabilitado={deshabilitado}
                onGuardar={(texto) => onGuardarPregunta(p.id, texto)}
                onQuitar={() => onQuitarPregunta(p.id)}
              />
            ))}
            {preguntas.length === 0 && <span className="texto-gris">Aún no hay preguntas para esta etapa.</span>}
            <div>
              <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado} onClick={onGenerar}>
                {preguntas.length ? "Regenerar preguntas con IA" : "Generar preguntas con IA"}
              </button>
            </div>
          </div>
        </details>
      )}
    </li>
  );
}

function FilaPregunta({
  numero,
  pregunta,
  deshabilitado,
  onGuardar,
  onQuitar,
}: {
  numero: number;
  pregunta: PreguntaVacante;
  deshabilitado: boolean;
  onGuardar: (texto: string) => void;
  onQuitar: () => void;
}) {
  const [texto, setTexto] = useState(pregunta.texto);

  return (
    <div className="flex" style={{ gap: 8, alignItems: "flex-start" }}>
      <b style={{ paddingTop: 10 }}>{numero}</b>
      <textarea
        className="inp"
        rows={2}
        value={texto}
        aria-label={`Pregunta ${numero}`}
        disabled={deshabilitado}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if (texto.trim() !== pregunta.texto) onGuardar(texto);
        }}
        style={{ flex: 1 }}
      />
      <button type="button" className="btn-enlace" disabled={deshabilitado} onClick={onQuitar} style={{ paddingTop: 10 }}>
        Quitar
      </button>
    </div>
  );
}
