import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import {
  candidatoDetalle,
  evaluacionEjemplo,
  hojaVidaEjemplo,
  obtenerVacante,
  respuestasEjemplo,
} from "@/lib/datos-prueba";

// E · Detalle del postulante: respuestas transcritas, CV sin datos personales y evaluación con evidencia.
export function generateStaticParams() {
  return [{ postulante: candidatoDetalle }];
}

export default async function DetallePostulante({
  params,
}: {
  params: Promise<{ vacante: string; postulante: string }>;
}) {
  const { vacante: idVacante, postulante } = await params;
  const vacante = obtenerVacante(idVacante);
  if (!vacante || postulante !== candidatoDetalle) notFound();

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <Link href={`/gestion/${vacante.id}/postulantes`} className="volver">
            ← {vacante.cargo} · Postulantes
          </Link>
          <h1 className="titulo-pagina">Candidato #{postulante}</h1>
        </div>
        <span className="chip chip-grande">Datos personales ocultos hasta la entrevista</span>
      </div>

      <div className="dos">
        <section className="ancho">
          <div className="tarjeta">
            <h2 style={{ fontSize: 18 }}>Respuestas</h2>
            <div className="flex">
              <span className="pill">Preguntas por texto</span>
              <span className="pill on">Preguntas por voz (transcripción)</span>
            </div>
            {respuestasEjemplo.map((r, i) => (
              <div key={r.pregunta} className="resp">
                <span className="etq">
                  Pregunta {i + 1} · {r.duracion} min
                </span>
                <b>{r.pregunta}</b>
                <p>{r.texto}</p>
              </div>
            ))}
          </div>

          <div className="tarjeta">
            <h2 style={{ fontSize: 18 }}>Hoja de vida (sin datos personales)</h2>
            <div className="grid-datos">
              {hojaVidaEjemplo.map((d) => (
                <div key={d.etiqueta}>
                  <small>{d.etiqueta}</small>
                  {d.valor}
                </div>
              ))}
              <div>
                <small>Requisitos mínimos</small>
                <b style={{ color: "#1F6B44" }}>Cumple</b>
              </div>
            </div>
          </div>
        </section>

        <aside className="lado">
          <div className="tarjeta">
            <div className="flex" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ fontSize: 18 }}>Evaluación de la IA</h2>
              <span style={{ fontSize: 24, fontWeight: 700 }}>
                {evaluacionEjemplo.ajuste}
                <span style={{ fontSize: 14, color: "var(--gris)", fontWeight: 500 }}>/100</span>
              </span>
            </div>
            {evaluacionEjemplo.criterios.map((c) => (
              <div key={c.nombre}>
                <div className="fila-puntaje">
                  <span>{c.nombre}</span>
                  <span className="num">{c.puntaje}</span>
                </div>
                <Barra valor={c.puntaje} fina />
                <div className="evidencia">{c.evidencia}</div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 12, fontSize: 13, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6 }}>
              <span>
                <b>Fortalezas:</b> {evaluacionEjemplo.fortalezas}
              </span>
              <span>
                <b>Para profundizar en la entrevista:</b> {evaluacionEjemplo.profundizar}
              </span>
            </div>
          </div>

          <div className="tarjeta">
            <h2 style={{ fontSize: 16 }}>Tu decisión</h2>
            <span className="texto-gris">La IA no descarta a nadie. Decide gestión humana.</span>
            <div className="flex" style={{ gap: 10 }}>
              <button type="button" className="btn btn-sec btn-ancho">
                No pasa
              </button>
              <button type="button" className="btn btn-verde btn-ancho">
                Pasa a la siguiente etapa
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
