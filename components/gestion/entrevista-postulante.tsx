"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { Barra } from "@/components/barra";
import { analizarEntrevista, guardarTranscripcion } from "@/lib/gestion/entrevista";
import type { ResultadoEntrevista } from "@/lib/gestion/tipos-evaluacion";
import { hablantes, LARGO_MAXIMO_TRANSCRIPCION, leerTranscripcion, SIN_IDENTIFICAR } from "@/lib/transcripcion";

type Analisis = ResultadoEntrevista & { nombre: string; fechaAnalisis: string };

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// Entrevista del postulante (2026-11-19): pegar o subir la transcripción de Teams, Meet o Zoom,
// elegir quién es el candidato, guardarla y analizarla con la IA. El análisis queda guardado y
// su puntaje cuenta en el total como una etapa más.
export function EntrevistaPostulante({
  vacanteId,
  postulacionId,
  guardada,
  analisis,
}: {
  vacanteId: string;
  postulacionId: string;
  guardada: { transcripcion: string; hablante: string | null; actualizada: string } | null;
  analisis: Analisis | null;
}) {
  const router = useRouter();
  const id = useId();
  const [texto, setTexto] = useState(guardada?.transcripcion ?? "");
  const [candidato, setCandidato] = useState(guardada?.hablante ?? "");
  const [editando, setEditando] = useState(!guardada);
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  const [accion, setAccion] = useState<"guardar" | "analizar" | null>(null);

  const quienes = useMemo(() => hablantes(leerTranscripcion(texto)), [texto]);
  const sinCambios = guardada != null && texto.trim() === guardada.transcripcion && candidato === (guardada.hablante ?? "");
  const minutosAprox = Math.max(1, Math.round(texto.split(/\s+/).filter(Boolean).length / 140));

  // Al pegar, si hay un solo hablante o ninguno se usa ese; si hay varios, se propone el que más habla.
  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    const lista = hablantes(leerTranscripcion(nuevo));
    if (!lista.some((h) => h.nombre === candidato)) setCandidato(lista.length === 1 ? lista[0].nombre : "");
  }

  async function leerArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (archivo.size > LARGO_MAXIMO_TRANSCRIPCION * 2) {
      setAviso({ ok: false, mensaje: "El archivo es muy grande para ser una transcripción." });
      return;
    }
    if (!/\.(vtt|txt|srt)$/i.test(archivo.name)) {
      setAviso({ ok: false, mensaje: "Sube un archivo .vtt o .txt. Si tienes un Word, abre el archivo y copia y pega el texto." });
      return;
    }
    setAviso(null);
    cambiarTexto(await archivo.text());
  }

  function guardar() {
    setAccion("guardar");
    empezar(async () => {
      const r = await guardarTranscripcion(vacanteId, postulacionId, texto, candidato);
      setAviso(r);
      if (r.ok) {
        setEditando(false);
        router.refresh();
      }
    });
  }

  function analizar() {
    setAccion("analizar");
    setAviso(null);
    empezar(async () => {
      const r = await analizarEntrevista(vacanteId, postulacionId);
      setAviso(r);
      router.refresh();
    });
  }

  return (
    <div className="entrevista">
      {editando ? (
        <>
          <ol className="entrevista__pasos">
            <li>Al terminar la entrevista en Teams, Meet o Zoom, descarga la transcripción o cópiala.</li>
            <li>Pégala aquí o sube el archivo (.vtt o .txt). Puede ser de 10 minutos o de una hora.</li>
            <li>Elige quién es el candidato y guarda. Después, analízala con la IA.</li>
          </ol>

          <div className="campo">
            <label htmlFor={`${id}-texto`}>Transcripción de la entrevista</label>
            <textarea
              id={`${id}-texto`}
              className="area entrevista__texto"
              value={texto}
              maxLength={LARGO_MAXIMO_TRANSCRIPCION}
              placeholder={"Ana Pérez   0:03\nBuenos días, cuéntame de tu experiencia…\n\nCarlos Gómez   0:15\nClaro, trabajé dos años en…"}
              disabled={pendiente}
              onChange={(e) => cambiarTexto(e.target.value)}
              aria-describedby={`${id}-ayuda`}
            />
            <span id={`${id}-ayuda`} className="texto-gris">
              {texto
                ? `${texto.length.toLocaleString("es-CO")} caracteres · unos ${minutosAprox} min de conversación`
                : "Los nombres se cambian por “Candidato” y “Entrevistador” antes de enviarla a la IA."}
            </span>
          </div>

          <label className="btn btn-sec btn-chico entrevista__archivo">
            Subir archivo .vtt o .txt
            <input type="file" accept=".vtt,.txt,.srt,text/vtt,text/plain" className="sr-solo" onChange={leerArchivo} disabled={pendiente} />
          </label>

          {texto.trim() && (
            <fieldset className="entrevista__hablantes">
              <legend>¿Quién es el candidato?</legend>
              {quienes.map((h) => (
                <label key={h.nombre} className="entrevista__hablante">
                  <input
                    type="radio"
                    name={`${id}-candidato`}
                    value={h.nombre}
                    checked={candidato === h.nombre}
                    onChange={() => setCandidato(h.nombre)}
                  />
                  <span>
                    <b>{h.nombre === SIN_IDENTIFICAR ? "No se distinguen los hablantes" : h.nombre}</b>
                    <small>
                      {h.turnos} {h.turnos === 1 ? "intervención" : "intervenciones"} · {h.palabras.toLocaleString("es-CO")}{" "}
                      {h.palabras === 1 ? "palabra" : "palabras"}
                    </small>
                  </span>
                </label>
              ))}
              {quienes.length === 1 && quienes[0].nombre === SIN_IDENTIFICAR && (
                <span className="texto-gris">
                  No encontramos nombres de quién habla. La IA analizará toda la conversación; si puedes, usa la transcripción
                  de Teams con los nombres.
                </span>
              )}
            </fieldset>
          )}

          <div className="flex">
            <button type="button" className="btn btn-chico" disabled={pendiente || !texto.trim() || !candidato || sinCambios} onClick={guardar}>
              {pendiente && accion === "guardar" ? "Guardando…" : "Guardar transcripción"}
            </button>
            {guardada && (
              <button
                type="button"
                className="btn-enlace"
                disabled={pendiente}
                onClick={() => {
                  setTexto(guardada.transcripcion);
                  setCandidato(guardada.hablante ?? "");
                  setEditando(false);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      ) : (
        guardada && (
          <div className="entrevista__guardada">
            <span>
              <b>Transcripción guardada</b> · {fecha(guardada.actualizada)} ·{" "}
              {guardada.transcripcion.length.toLocaleString("es-CO")} caracteres
              {guardada.hablante && guardada.hablante !== SIN_IDENTIFICAR && <> · candidato: {guardada.hablante}</>}
            </span>
            <div className="flex">
              <button type="button" className="btn btn-claro btn-chico" disabled={pendiente} onClick={analizar}>
                {pendiente && accion === "analizar" ? "Analizando la entrevista… (puede tardar un minuto)" : analisis ? "Volver a analizar" : "Analizar entrevista con IA"}
              </button>
              <button type="button" className="btn-enlace" disabled={pendiente} onClick={() => setEditando(true)}>
                Cambiar transcripción
              </button>
            </div>
            {analisis && guardada.actualizada > analisis.fechaAnalisis && (
              <span className="nota nota-na">La transcripción cambió después del último análisis. Vuelve a analizarla.</span>
            )}
          </div>
        )
      )}

      {aviso && (
        <div className={aviso.ok ? "nota nota-az" : "nota nota-error"} role={aviso.ok ? "status" : "alert"}>
          {aviso.mensaje}
        </div>
      )}

      {analisis && <AnalisisEntrevista analisis={analisis} />}
    </div>
  );
}

function AnalisisEntrevista({ analisis }: { analisis: Analisis }) {
  return (
    <div className="analisis-entrevista">
      <div className="analisis-entrevista__cabeza">
        <div>
          <span className="etiqueta-sec">{analisis.nombre} · análisis de la IA</span>
          <span className="texto-gris">
            {fecha(analisis.fechaAnalisis)} · {analisis.turnosCandidato} intervenciones del candidato ·{" "}
            {analisis.palabrasCandidato.toLocaleString("es-CO")} palabras
          </span>
        </div>
        <div className="total-ia total-ia--chico">
          <b>{analisis.ajuste ?? "—"}</b>
          <span>de 100</span>
        </div>
      </div>

      {analisis.sospecha && (
        <div className="nota nota-error" role="alert">
          <span>
            <b>Posible intento de manipular la evaluación.</b> Revisa la entrevista a mano.
            {analisis.motivoSospecha && <> Motivo: {analisis.motivoSospecha}</>}
          </span>
        </div>
      )}

      {analisis.resumen && <p className="analisis-entrevista__resumen">{analisis.resumen}</p>}

      {analisis.temas.length > 0 && (
        <div className="analisis-entrevista__temas">
          {analisis.temas.map((t) => (
            <span key={t} className="chip-estado chip-estado--neutro">
              {t}
            </span>
          ))}
        </div>
      )}

      <div>
        {analisis.criterios.map((c) => (
          <div key={c.nombre} className="criterio">
            <div className="criterio__fila">
              <span>
                {c.nombre} <span className="texto-gris">· peso {c.peso}%</span>
              </span>
              <b>{c.puntaje ?? "Sin evidencia"}</b>
            </div>
            {c.puntaje != null && <Barra valor={c.puntaje} fina />}
            <div className="criterio__cita">
              {c.cita ? (
                <>
                  “{c.cita}” <span className="texto-gris">(intervención {c.turno})</span>
                </>
              ) : (
                c.evidencia
              )}
              {c.puntaje != null && c.verificada === false && (
                <span className="criterio__aviso"> · La cita no aparece tal cual en lo que dijo el candidato: revísala.</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="analisis-entrevista__columnas">
        <div>
          <span className="etiqueta-sec">Fortalezas</span>
          <ul>
            {analisis.fortalezas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="etiqueta-sec">Puntos débiles</span>
          <ul>
            {analisis.debilidades.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {analisis.profundizar && (
        <p className="texto-gris">
          <b>Quedó sin aclarar:</b> {analisis.profundizar}
        </p>
      )}

      {analisis.momentos.length > 0 && (
        <div>
          <span className="etiqueta-sec">Momentos clave</span>
          <ul className="analisis-entrevista__momentos">
            {analisis.momentos.map((m) => (
              <li key={m.turno}>
                <span className="chip-estado chip-estado--neutro">Intervención {m.turno}</span> {m.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <span className="texto-gris">La IA no evalúa acento, forma de hablar ni rasgos personales, y no decide: la decisión es tuya.</span>
    </div>
  );
}
