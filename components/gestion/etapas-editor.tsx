"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agregarEtapa, moverEtapa, quitarEtapa, renombrarEtapa } from "@/lib/gestion/acciones-configuracion";
import type { EtapaVacante, PreguntaVacante } from "@/lib/gestion/configuracion";
import { agregarPreguntaManual, generarPreguntas, guardarPregunta, quitarPregunta } from "@/lib/gestion/preguntas";

const TIPOS = [
  { valor: "texto", titulo: "Preguntas por texto" },
  { valor: "voz", titulo: "Preguntas por voz" },
  { valor: "entrevista", titulo: "Entrevista" },
  { valor: "cv", titulo: "Revisión de CV" },
];

const ENFOQUES = [
  { valor: "cargo", titulo: "Del cargo" },
  { valor: "social", titulo: "Sociales o situacionales" },
];

const MODOS = [...ENFOQUES, { valor: "mixta", titulo: "Mezcla de ambas" }];

const titulo = (valor: string) => TIPOS.find((t) => t.valor === valor)?.titulo ?? valor;

type Resultado = { ok: boolean; mensaje?: string };

// Etapas del proceso: se nombran, se ordenan con las flechas y se quitan. Cada etapa
// (salvo la revisión de CV) tiene sus preguntas: generadas con IA, escritas a mano, o ambas.
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
            onGenerar={(modo) => ejecutar(() => generarPreguntas(vacanteId, e.id, modo))}
            onAgregarPregunta={(texto, enfoque) => ejecutar(() => agregarPreguntaManual(vacanteId, e.id, texto, enfoque))}
            onGuardarPregunta={(id, texto, enfoque) => ejecutar(() => guardarPregunta(id, vacanteId, texto, enfoque))}
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
  onAgregarPregunta,
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
  onGenerar: (modo: string) => void;
  onAgregarPregunta: (texto: string, enfoque: string) => void;
  onGuardarPregunta: (id: string, texto: string, enfoque: string) => void;
  onQuitarPregunta: (id: string) => void;
}) {
  const [nombre, setNombre] = useState(etapa.nombre ?? "");
  const [modo, setModo] = useState("cargo");
  const [agregando, setAgregando] = useState(false);
  const [nueva, setNueva] = useState("");
  const [enfoqueNueva, setEnfoqueNueva] = useState("cargo");

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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {preguntas.map((p, i) => (
              <FilaPregunta
                key={p.id}
                numero={i + 1}
                pregunta={p}
                deshabilitado={deshabilitado}
                onGuardar={(texto, enfoque) => onGuardarPregunta(p.id, texto, enfoque)}
                onQuitar={() => onQuitarPregunta(p.id)}
              />
            ))}
            {preguntas.length === 0 && <span className="texto-gris">Aún no hay preguntas para esta etapa.</span>}

            {agregando ? (
              <div className="tarjeta" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  className="inp"
                  rows={2}
                  value={nueva}
                  placeholder="Escribe la pregunta"
                  aria-label="Nueva pregunta"
                  onChange={(e) => setNueva(e.target.value)}
                />
                <div className="flex" style={{ gap: 8 }}>
                  <select className="inp" value={enfoqueNueva} onChange={(e) => setEnfoqueNueva(e.target.value)} aria-label="Enfoque de la pregunta">
                    {ENFOQUES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.titulo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-chico"
                    disabled={deshabilitado || !nueva.trim()}
                    onClick={() => {
                      onAgregarPregunta(nueva, enfoqueNueva);
                      setNueva("");
                      setAgregando(false);
                    }}
                  >
                    Guardar pregunta
                  </button>
                  <button type="button" className="btn-enlace" onClick={() => setAgregando(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button type="button" className="btn btn-punto btn-chico" disabled={deshabilitado} onClick={() => setAgregando(true)}>
                  + Agregar pregunta
                </button>
              </div>
            )}

            <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
              <select className="inp" value={modo} onChange={(e) => setModo(e.target.value)} aria-label="Enfoque de las preguntas con IA">
                {MODOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.titulo}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado} onClick={() => onGenerar(modo)}>
                Generar con IA
              </button>
              <span className="texto-gris" style={{ fontSize: 12 }}>
                Reemplaza solo las preguntas creadas por la IA.
              </span>
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
  onGuardar: (texto: string, enfoque: string) => void;
  onQuitar: () => void;
}) {
  const [texto, setTexto] = useState(pregunta.texto);
  const [enfoque, setEnfoque] = useState<string>(pregunta.enfoque);

  function guardar(nuevoTexto: string, nuevoEnfoque: string) {
    if (nuevoTexto.trim() !== pregunta.texto || nuevoEnfoque !== pregunta.enfoque) onGuardar(nuevoTexto, nuevoEnfoque);
  }

  return (
    <div className="flex" style={{ gap: 8, alignItems: "flex-start" }}>
      <b style={{ paddingTop: 10 }}>{numero}</b>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <textarea
          className="inp"
          rows={2}
          value={texto}
          aria-label={`Pregunta ${numero}`}
          disabled={deshabilitado}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => guardar(texto, enfoque)}
        />
        <span className="texto-gris" style={{ fontSize: 12 }}>
          {pregunta.origen === "ia" ? "Creada con IA" : "Escrita a mano"}
        </span>
      </div>
      <select
        className="inp"
        value={enfoque}
        disabled={deshabilitado}
        aria-label={`Enfoque de la pregunta ${numero}`}
        onChange={(e) => {
          setEnfoque(e.target.value);
          guardar(texto, e.target.value);
        }}
      >
        {ENFOQUES.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.titulo}
          </option>
        ))}
      </select>
      <button type="button" className="btn-enlace" disabled={deshabilitado} onClick={onQuitar} style={{ paddingTop: 10 }}>
        Quitar
      </button>
    </div>
  );
}
