"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TIEMPO_MAX = 120; // segundos por respuesta de voz

type Estado = "listo" | "grabando" | "grabado";
type Modo = "voz" | "texto";

function formatear(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

// Flujo de preguntas: voz (grabación simulada en Fase 1) o texto por "Solicitar ajuste".
export function PreguntasVoz({ preguntas, rutaTerminado }: { preguntas: string[]; rutaTerminado: string }) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [modo, setModo] = useState<Modo>("voz");
  const [estado, setEstado] = useState<Estado>("listo");
  const [segundos, setSegundos] = useState(0);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (estado !== "grabando") return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [estado]);

  useEffect(() => {
    if (estado === "grabando" && segundos >= TIEMPO_MAX) setEstado("grabado");
  }, [segundos, estado]);

  const esUltima = indice === preguntas.length - 1;
  const titulo = modo === "voz" ? "Preguntas por voz" : "Preguntas por texto";

  function alternarGrabacion() {
    if (estado === "grabando") {
      setEstado("grabado");
      return;
    }
    setSegundos(0);
    setEstado("grabando");
  }

  function siguiente() {
    if (esUltima) {
      router.push(rutaTerminado);
      return;
    }
    setIndice((i) => i + 1);
    setEstado("listo");
    setSegundos(0);
    setTexto("");
    setModo("voz");
  }

  return (
    <>
      <div className="progreso">
        <div className="progreso-texto">
          <b>{titulo}</b>
          <span className="texto-gris">
            Pregunta {indice + 1} de {preguntas.length}
          </span>
        </div>
        <div className="barra barra-fina">
          <div style={{ width: `${((indice + 1) / preguntas.length) * 100}%` }} />
        </div>
      </div>

      <div className="contenido">
        <div className="tarjeta pregunta">
          <span className="etq">Pregunta</span>
          <p>{preguntas[indice]}</p>
          {modo === "voz" && <span className="texto-gris">Tienes hasta 2 minutos para responder.</span>}
        </div>

        {modo === "voz" ? (
          <div className="zona-grabar">
            <button
              type="button"
              className={estado === "grabando" ? "boton-grabar grabando" : "boton-grabar"}
              aria-label={estado === "grabando" ? "Detener grabación" : "Grabar respuesta"}
              onClick={alternarGrabacion}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </button>
            <b style={{ fontSize: 15 }}>
              {estado === "grabando" ? "Toca para detener" : estado === "grabado" ? "Respuesta lista" : "Toca para grabar"}
            </b>
            <span className="tiempo">
              {formatear(segundos)} / {formatear(TIEMPO_MAX)}
            </span>
          </div>
        ) : (
          <div className="campo">
            <label htmlFor="respuesta-texto">Tu respuesta</label>
            <textarea
              id="respuesta-texto"
              className="area"
              placeholder="Escribe tu respuesta aquí"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
        )}

        <button type="button" className="btn btn-sec" onClick={siguiente}>
          {esUltima ? "Terminar cuestionario" : "Siguiente pregunta"}
        </button>

        <div className="ajuste-pie">
          {modo === "voz" ? (
            <button type="button" className="boton-enlace" onClick={() => setModo("texto")}>
              Solicitar ajuste: responder por texto
            </button>
          ) : (
            <button type="button" className="boton-enlace" onClick={() => setModo("voz")}>
              Volver a responder por voz
            </button>
          )}
          <span className="texto-gris">No tienes que explicar el motivo.</span>
        </div>
      </div>
    </>
  );
}
