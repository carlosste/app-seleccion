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

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
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
  // Preguntas bloqueadas: nadie las cambia, así todos los postulantes responden las mismas.
  const bloqueada = etapa.bloqueada && etapa.tipo !== "cv";
  const sinEditar = deshabilitado || bloqueada;

  return (
    <li className="paso" data-tipo={etapa.tipo}>
      <b aria-hidden="true">{posicion}</b>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 }}>
        <span className="etapa-tipo">
          Etapa {posicion} · {titulo(etapa.tipo)}
        </span>
        <input
          className="inp"
          value={nombre}
          maxLength={80}
          placeholder={titulo(etapa.tipo)}
          aria-label={`Nombre de la etapa ${posicion}`}
          disabled={deshabilitado}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => {
            if (nombre.trim() !== (etapa.nombre ?? "")) onRenombrar(nombre);
          }}
        />
        {bloqueada && (
          <span className="chip" style={{ alignSelf: "flex-start" }}>
            {etapa.llegaron > 0
              ? `Preguntas bloqueadas: ${etapa.llegaron} postulante(s) ya llegaron`
              : "Preguntas bloqueadas al publicar: todos responden las mismas"}
          </span>
        )}
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado || esPrimera} onClick={() => onMover("subir")} aria-label="Subir etapa">
          ↑
        </button>
        <button type="button" className="btn btn-sec btn-chico" disabled={deshabilitado || esUltima} onClick={() => onMover("bajar")} aria-label="Bajar etapa">
          ↓
        </button>
        <button
          type="button"
          className="btn-enlace"
          disabled={sinEditar}
          aria-label={`Quitar la etapa ${posicion}`}
          onClick={() => {
            const aviso =
              preguntas.length > 0
                ? `¿Quitar la etapa ${posicion} y sus ${preguntas.length} preguntas? No se puede deshacer.`
                : `¿Quitar la etapa ${posicion}? No se puede deshacer.`;
            if (window.confirm(aviso)) onQuitar();
          }}
        >
          Quitar
        </button>
      </div>

      {etapa.tipo !== "cv" && (
        <details className="etapa-preguntas">
          <summary>Preguntas ({preguntas.length})</summary>
          <div className="lista-preguntas">
            {preguntas.map((p, i) => (
              <FilaPregunta
                key={p.id}
                numero={i + 1}
                pregunta={p}
                deshabilitado={sinEditar}
                onGuardar={(texto, enfoque) => onGuardarPregunta(p.id, texto, enfoque)}
                onQuitar={() => onQuitarPregunta(p.id)}
              />
            ))}
            {preguntas.length === 0 && <span className="texto-gris">Aún no hay preguntas para esta etapa.</span>}

            {/* Herramientas aparte de la lista, para que no se mezclen con las preguntas. */}
            {!bloqueada && (
              <div className="herramientas-preguntas">
                <span className="etq">Agregar o generar preguntas</span>
                {agregando ? (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      className="area"
                      style={{ minHeight: 72 }}
                      value={nueva}
                      placeholder="Escribe la pregunta"
                      aria-label="Nueva pregunta"
                      onChange={(e) => setNueva(e.target.value)}
                    />
                    <div className="flex" style={{ gap: 8 }}>
                      <select
                        className="inp"
                        style={{ width: "auto", height: 40 }}
                        value={enfoqueNueva}
                        onChange={(e) => setEnfoqueNueva(e.target.value)}
                        aria-label="Enfoque de la pregunta"
                      >
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
                  <button type="button" className="btn btn-punto btn-chico" disabled={deshabilitado} onClick={() => setAgregando(true)}>
                    + Escribir una pregunta
                  </button>
                )}
                <span aria-hidden="true" style={{ width: 1, height: 28, background: "var(--primario-borde)" }} />
                <select
                  className="inp"
                  style={{ width: "auto", height: 40 }}
                  value={modo}
                  onChange={(e) => setModo(e.target.value)}
                  aria-label="Enfoque de las preguntas con IA"
                >
                  {MODOS.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.titulo}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-claro btn-chico" disabled={deshabilitado} onClick={() => onGenerar(modo)}>
                  {deshabilitado ? "Generando…" : "Generar con IA"}
                </button>
                <span className="texto-gris" style={{ fontSize: 12, width: "100%" }}>
                  Generar con IA reemplaza solo las preguntas creadas por la IA; las escritas a mano se conservan.
                </span>
              </div>
            )}
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
    <div className="pregunta-fila">
      <span className="pregunta-numero" aria-hidden="true">
        {numero}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 280px" }}>
        <textarea
          className="area"
          style={{ minHeight: 64 }}
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
        style={{ width: "auto", height: 40, marginTop: 4 }}
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
      <button
        type="button"
        className="btn-enlace"
        disabled={deshabilitado}
        aria-label={`Quitar la pregunta ${numero}`}
        onClick={onQuitar}
        style={{ paddingTop: 14, color: "var(--peligro)" }}
      >
        Quitar
      </button>
    </div>
  );
}
