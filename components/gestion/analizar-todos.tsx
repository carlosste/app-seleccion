"use client";

import { useEffect, useRef, useState } from "react";
import { evaluarPostulacion } from "@/lib/gestion/evaluacion";

type Resultado = { numero: string; ok: boolean; mensaje: string };

// "Analizar todos con IA": evalúa a los postulantes en proceso uno por uno, en el orden de
// la lista. Uno a la vez para no saturar a Gemini ni pasarse del tiempo de Vercel. La
// calificación usa la misma rúbrica, escala fija y temperatura 0 para todos (coherencia).
// Los que no tienen nada nuevo se resuelven sin llamar a la IA.
export function AnalizarTodos({ vacanteId, postulantes }: { vacanteId: string; postulantes: { id: string; numero: string }[] }) {
  const [corriendo, setCorriendo] = useState(false);
  const [actual, setActual] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const detener = useRef(false);

  // Si se cierra la pestaña a mitad de camino, se pierde lo que faltaba: se avisa.
  useEffect(() => {
    if (!corriendo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [corriendo]);

  async function analizar() {
    detener.current = false;
    setResultados([]);
    setCorriendo(true);
    for (const [i, p] of postulantes.entries()) {
      if (detener.current) break;
      setActual(i);
      let r: Resultado;
      try {
        const respuesta = await evaluarPostulacion(vacanteId, p.id);
        r = { numero: p.numero, ok: respuesta.ok, mensaje: respuesta.mensaje };
      } catch {
        r = { numero: p.numero, ok: false, mensaje: "Falló la conexión. Puedes volver a intentarlo." };
      }
      setResultados((anteriores) => [...anteriores, r]);
    }
    setCorriendo(false);
  }

  if (postulantes.length === 0) return null;
  const hechos = resultados.length;
  const errores = resultados.filter((r) => !r.ok).length;
  const descartados = resultados.filter((r) => r.mensaje.includes("descartada")).length;

  return (
    <div className="tarjeta" style={{ gap: 10 }}>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <b>Analizar todos con IA</b>
          <div className="texto-gris" style={{ fontSize: 13 }}>
            {postulantes.length} postulante(s) en proceso. Se evalúan uno por uno con el mismo criterio; puede tardar
            unos segundos por persona. Deja esta pestaña abierta.
          </div>
        </div>
        {corriendo ? (
          <button type="button" className="btn btn-sec btn-chico" onClick={() => (detener.current = true)}>
            Detener
          </button>
        ) : (
          <button type="button" className="btn btn-chico" onClick={analizar}>
            {hechos ? "Volver a analizar" : "Analizar todos"}
          </button>
        )}
      </div>

      {(corriendo || hechos > 0) && (
        <>
          <div className="barra" aria-hidden="true">
            <div style={{ width: `${(hechos / postulantes.length) * 100}%` }} />
          </div>
          <span className="texto-gris" role="status" style={{ fontSize: 13 }}>
            {corriendo
              ? `Evaluando al Candidato #${postulantes[actual]?.numero} (${actual + 1} de ${postulantes.length})…`
              : `Listo: ${hechos} de ${postulantes.length} revisados${descartados ? `, ${descartados} descartado(s) por requisitos mínimos` : ""}${errores ? `, ${errores} con error` : ""}.`}
          </span>
          {hechos > 0 && (
            <details>
              <summary style={{ cursor: "pointer", fontSize: 13 }}>Ver el resultado de cada uno</summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                {resultados.map((r) => (
                  <li key={r.numero} style={{ color: r.ok ? undefined : "var(--naranja)" }}>
                    <b>#{r.numero}:</b> {r.mensaje}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
