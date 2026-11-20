"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderPregunta, type ModoRespuesta } from "@/app/postular/acciones";

export type PreguntaPendiente = {
  id: string;
  texto: string;
  tipoEtapa: "texto" | "voz";
  numero: number; // posición dentro de su etapa
  total: number;
};

const LARGO_MAXIMO = 3000;

// Cuestionario del postulante: una pregunta a la vez y cada respuesta se guarda al enviarla.
// Preguntas de voz (2026-11-19, Carlos): el navegador dicta (Web Speech API) y el texto aparece
// mientras la persona habla; lo puede corregir antes de enviar. No se guarda audio, solo el texto
// (modalidad "voz"). Si el navegador no dicta, o la persona toca "Prefiero escribir" (el
// "Solicitar ajuste" de CLAUDE.md, sin explicar motivo), responde escribiendo.
export function PreguntasVoz({
  token,
  preguntas,
  rutaTerminado,
}: {
  token: string;
  preguntas: PreguntaPendiente[];
  rutaTerminado: string;
}) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const pregunta = preguntas[indice];
  const esUltima = indice === preguntas.length - 1;

  return (
    <FormPregunta
      key={pregunta.id}
      token={token}
      pregunta={pregunta}
      esUltima={esUltima}
      primera={indice === 0}
      onListo={(fin) => (fin || esUltima ? router.push(rutaTerminado) : setIndice((i) => i + 1))}
    />
  );
}

function FormPregunta({
  token,
  pregunta,
  esUltima,
  primera,
  onListo,
}: {
  token: string;
  pregunta: PreguntaPendiente;
  esUltima: boolean;
  primera: boolean;
  onListo: (fin: boolean) => void;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [prefiereEscribir, setPrefiereEscribir] = useState(false);
  const [usoVoz, setUsoVoz] = useState(false);
  const [grabando, setGrabando] = useState(false);
  // Se mira en el navegador, después de cargar: en el servidor no existe `window`.
  const [hayDictado, setHayDictado] = useState<boolean | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => setHayDictado(constructorDictado() !== null), []);

  const esVoz = pregunta.tipoEtapa === "voz";
  // Dictando: el cuadro muestra lo que se transcribe y no se escribe a mano al mismo tiempo.
  const conDictado = esVoz && !prefiereEscribir && hayDictado !== false;
  const valido = texto.trim().length >= 2;

  // Al pasar a otra pregunta, el foco va al enunciado: el lector de pantalla la lee y en el
  // celular la pantalla vuelve arriba.
  useEffect(() => {
    if (!primera) titulo.current?.focus();
  }, [primera]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || enviando) return;
    setError(null);
    const modo: ModoRespuesta = !esVoz ? "texto" : prefiereEscribir ? "ajuste" : usoVoz ? "voz" : "texto";
    iniciar(async () => {
      const r = await responderPregunta(token, pregunta.id, texto, modo);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      onListo(Boolean(r.fin));
    });
  }

  return (
    <>
      <div className="progreso">
        <div className="progreso-texto">
          <b>{esVoz ? "Preguntas por voz" : "Preguntas por texto"}</b>
          <span className="texto-gris">
            Pregunta {pregunta.numero} de {pregunta.total}
          </span>
        </div>
        <div
          className="barra barra-fina"
          role="progressbar"
          aria-label="Avance de esta etapa"
          aria-valuemin={0}
          aria-valuemax={pregunta.total}
          aria-valuenow={pregunta.numero}
        >
          <div style={{ width: `${(pregunta.numero / pregunta.total) * 100}%` }} />
        </div>
      </div>

      <form className="contenido" onSubmit={enviar}>
        <div className="tarjeta pregunta">
          <span className="etq">
            Pregunta {pregunta.numero} de {pregunta.total}
          </span>
          <h1 ref={titulo} tabIndex={-1} className="pregunta__texto">
            {pregunta.texto}
          </h1>
        </div>

        {esVoz && !prefiereEscribir && hayDictado === false && (
          <div className="nota nota-na" role="status">
            Tu navegador no permite responder por voz. Escribe tu respuesta: cuenta igual. Si prefieres hablar, abre este
            enlace en Chrome, Edge o Safari.
          </div>
        )}

        {conDictado && (
          <Dictado
            texto={texto}
            setTexto={setTexto}
            grabando={grabando}
            setGrabando={setGrabando}
            deshabilitado={enviando || hayDictado === null}
            onVoz={() => setUsoVoz(true)}
          />
        )}

        <div className="campo">
          <label htmlFor="respuesta-texto">{conDictado ? "Tu respuesta (puedes corregir lo que se escribió)" : "Tu respuesta"}</label>
          <textarea
            id="respuesta-texto"
            className="area"
            placeholder={conDictado ? "Aquí aparece lo que dices" : "Escribe tu respuesta aquí"}
            value={texto}
            maxLength={LARGO_MAXIMO}
            onChange={(e) => setTexto(e.target.value)}
            disabled={enviando}
            readOnly={grabando}
            aria-describedby="respuesta-cuenta"
          />
          <span id="respuesta-cuenta" className="texto-gris" style={{ textAlign: "right" }}>
            {texto.length} / {LARGO_MAXIMO} caracteres
          </span>
        </div>

        {error && (
          <div className="nota nota-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-grande" disabled={!valido || enviando || grabando}>
          {enviando ? "Guardando…" : esUltima ? "Enviar y terminar" : "Enviar y seguir"}
        </button>

        {esVoz && (
          <div className="ajuste-pie">
            {prefiereEscribir ? (
              <span className="texto-gris">Respondes por escrito. Cuenta igual que una respuesta por voz.</span>
            ) : hayDictado === false ? null : (
              <>
                <button
                  type="button"
                  className="boton-enlace boton-enlace--alto"
                  disabled={grabando}
                  onClick={() => setPrefiereEscribir(true)}
                >
                  Prefiero responder por escrito
                </button>
                <span className="texto-gris">No tienes que explicar el motivo.</span>
              </>
            )}
          </div>
        )}

        <span className="texto-gris centrado">Cada respuesta se guarda al enviarla. Si sales, al volver sigues donde ibas.</span>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dictado con la Web Speech API. Chrome, Edge y Safari la tienen; Firefox no.
// ---------------------------------------------------------------------------

type ResultadoVoz = { isFinal: boolean; 0: { transcript: string } };
type EventoVoz = { resultIndex: number; results: ArrayLike<ResultadoVoz> };
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type ConstructorReconocedor = new () => Reconocedor;

function constructorDictado(): ConstructorReconocedor | null {
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocedor; webkitSpeechRecognition?: ConstructorReconocedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORES_DICTADO: Record<string, string> = {
  "not-allowed": "No tenemos permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones y vuelve a intentar.",
  "service-not-allowed": "Tu navegador no permite el dictado. Puedes responder por escrito.",
  "audio-capture": "No encontramos un micrófono. Conecta uno o responde por escrito.",
  network: "Se cortó la conexión mientras dictabas. Lo que ya se escribió se guardó en el cuadro; toca Grabar para seguir.",
};

function unir(base: string, nuevo: string) {
  const a = base.trimEnd();
  const b = nuevo.trim();
  if (!b) return a;
  return a ? `${a} ${b}` : b.charAt(0).toUpperCase() + b.slice(1);
}

function Dictado({
  texto,
  setTexto,
  grabando,
  setGrabando,
  deshabilitado,
  onVoz,
}: {
  texto: string;
  setTexto: (t: string) => void;
  grabando: boolean;
  setGrabando: (g: boolean) => void;
  deshabilitado: boolean;
  onVoz: () => void;
}) {
  const [parcial, setParcial] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const reconocedor = useRef<Reconocedor | null>(null);
  const quiereGrabar = useRef(false);
  const textoRef = useRef(texto);
  useEffect(() => {
    textoRef.current = texto;
  }, [texto]);

  // Si la persona sale de la pregunta mientras graba, se suelta el micrófono.
  useEffect(() => () => {
    quiereGrabar.current = false;
    reconocedor.current?.abort();
  }, []);

  useEffect(() => {
    if (!grabando) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [grabando]);

  // Cada sesión de dictado agrega su texto al que ya está en el cuadro (que la persona pudo
  // corregir). Chrome corta la sesión tras un silencio largo: si sigue en "Grabando", se reanuda.
  function sesion() {
    const Constructor = constructorDictado();
    if (!Constructor) return;
    const rec = new Constructor();
    rec.lang = "es-CO";
    rec.continuous = true;
    rec.interimResults = true;
    const base = textoRef.current;

    rec.onresult = (e) => {
      let final = "";
      let enCurso = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += ` ${r[0].transcript}`;
        else enCurso += ` ${r[0].transcript}`;
      }
      if (final.trim()) {
        setTexto(unir(base, final).slice(0, LARGO_MAXIMO));
        onVoz();
      }
      setParcial(enCurso.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      quiereGrabar.current = false;
      setAviso(ERRORES_DICTADO[e.error] ?? "El dictado se detuvo. Toca Grabar para seguir o responde por escrito.");
    };
    rec.onend = () => {
      setParcial("");
      if (quiereGrabar.current) {
        sesion();
        return;
      }
      reconocedor.current = null;
      setGrabando(false);
    };

    reconocedor.current = rec;
    try {
      rec.start();
    } catch {
      quiereGrabar.current = false;
      setGrabando(false);
      setAviso("No pudimos empezar a grabar. Intenta otra vez.");
    }
  }

  function alternar() {
    if (grabando) {
      quiereGrabar.current = false;
      reconocedor.current?.stop();
      return;
    }
    setAviso(null);
    quiereGrabar.current = true;
    setGrabando(true);
    sesion();
  }

  const minutos = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="dictado">
      <button
        type="button"
        className={grabando ? "boton-grabar grabando" : "boton-grabar"}
        onClick={alternar}
        disabled={deshabilitado}
        aria-pressed={grabando}
      >
        {grabando ? (
          <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff" />
          </svg>
        ) : (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        )}
        <span className="sr-solo">{grabando ? "Detener la grabación" : "Grabar mi respuesta"}</span>
      </button>

      <div className="dictado__estado" aria-live="polite">
        {grabando ? (
          <>
            <b>
              <i className="dictado__punto" aria-hidden="true" /> Grabando · {minutos}
            </b>
            <span>Habla con calma. Toca el botón cuando termines.</span>
          </>
        ) : (
          <>
            <b>{texto ? "Toca para seguir grabando" : "Toca el micrófono y responde en voz alta"}</b>
            <span>Lo que digas se escribe abajo y puedes corregirlo antes de enviar.</span>
          </>
        )}
      </div>

      {parcial && (
        <p className="dictado__parcial" aria-hidden="true">
          {parcial}…
        </p>
      )}

      {aviso && (
        <div className="nota nota-error" role="alert">
          {aviso}
        </div>
      )}

      <p className="dictado__privacidad">
        Tu navegador convierte tu voz en texto (en Chrome lo hace un servicio de Google). No guardamos el audio: solo el
        texto que envíes.
      </p>
    </div>
  );
}
