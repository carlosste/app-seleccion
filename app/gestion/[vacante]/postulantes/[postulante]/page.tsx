import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { DecisionPostulante } from "@/components/gestion/decision-postulante";
import { EvaluarIa } from "@/components/gestion/evaluar-ia";
import { RespuestasPostulante } from "@/components/gestion/respuestas-postulante";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { obtenerPostulante } from "@/lib/gestion/datos";
import type { EstadoRequisito, VeredictoCv } from "@/lib/gestion/tipos-evaluacion";

const VEREDICTO: Record<VeredictoCv, { texto: string; color: string }> = {
  cumple: { texto: "Cumple", color: "#1F6B44" },
  no_cumple: { texto: "No cumple", color: "var(--naranja)" },
  por_revisar: { texto: "Por revisar", color: "var(--tx2)" },
};

const REQUISITO: Record<EstadoRequisito, { texto: string; clase: string }> = {
  cumple: { texto: "Cumple", clase: "est pasa" },
  no_cumple: { texto: "No cumple", clase: "est no" },
  no_se_sabe: { texto: "Sin dato", clase: "est pend" },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// E · Detalle del postulante: respuestas, CV sin datos personales, evaluación con evidencia y decisión.
// La postulación se busca con la sesión de la empresa: si es de otra empresa, 404.
export default async function DetallePostulante({ params }: PageProps<"/gestion/[vacante]/postulantes/[postulante]">) {
  const { vacante: idVacante, postulante: numero } = await params;
  const [datos, sesion] = await Promise.all([obtenerPostulante(idVacante, numero), requerirEmpresa()]);
  if (!datos) notFound();
  const { vacante, cv, rubrica } = datos;
  const enProceso = datos.estado === "en_proceso";
  const hayNuevo = !cv || datos.totalRespuestas !== (rubrica?.respuestasEvaluadas ?? 0);

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <Link href={`/gestion/${vacante.id}/postulantes`} className="volver">
            ← {vacante.cargo} · Postulantes
          </Link>
          <h1 className="titulo-pagina">{datos.revelado && datos.nombre ? datos.nombre : `Candidato #${datos.numero}`}</h1>
        </div>
        <div className="flex">
          {!datos.revelado && <span className="chip chip-grande">Datos personales ocultos hasta la entrevista</span>}
          {datos.revelado && datos.tieneCv ? (
            <a href={`/api/gestion/cv/${datos.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sec btn-chico">
              Ver CV original
            </a>
          ) : (
            <button type="button" className="btn btn-sec btn-chico" disabled title="El CV original se habilita al revelar el nombre en la entrevista final.">
              Ver CV original
            </button>
          )}
        </div>
      </div>

      <div className="dos">
        <section className="ancho">
          <div className="tarjeta">
            <h2 style={{ fontSize: 18 }}>Respuestas</h2>
            <RespuestasPostulante grupos={datos.grupos} />
          </div>

          <div className="tarjeta">
            <h2 style={{ fontSize: 18 }}>Hoja de vida (sin datos personales)</h2>
            {!cv ? (
              <span className="texto-gris">Sin analizar. Usa “Evaluar con IA” para leerla y revisar los requisitos mínimos.</span>
            ) : (
              <>
                <div className="grid-datos">
                  {cv.hojaDeVida.map((d) => (
                    <div key={d.etiqueta}>
                      <small>{d.etiqueta}</small>
                      {d.valor}
                    </div>
                  ))}
                  <div>
                    <small>Requisitos mínimos</small>
                    <b style={{ color: VEREDICTO[cv.veredicto].color }}>{VEREDICTO[cv.veredicto].texto}</b>
                  </div>
                </div>
                {cv.requisitos.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--linea)", paddingTop: 12 }}>
                    {cv.requisitos.map((q) => (
                      <div key={q.requisito + q.minimo}>
                        <div className="fila-puntaje" style={{ alignItems: "center", gap: 8 }}>
                          <span>
                            <b>{q.requisito}</b> · mínimo: {q.minimo}
                          </span>
                          <span className={REQUISITO[q.estado].clase}>{REQUISITO[q.estado].texto}</span>
                        </div>
                        <div className="evidencia">{q.evidencia}</div>
                      </div>
                    ))}
                  </div>
                )}
                {cv.veredicto === "por_revisar" && (
                  <span className="texto-gris" style={{ fontSize: 13 }}>
                    La IA no encontró algún dato: no se descarta. Revisa y decide tú.
                  </span>
                )}
                <span className="texto-gris" style={{ fontSize: 12 }}>
                  Analizada por la IA el {fecha(cv.fecha)}. Los requisitos mínimos no los ve el postulante.
                </span>
              </>
            )}
          </div>
        </section>

        <aside className="lado">
          <div className="tarjeta">
            <div className="flex" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ fontSize: 18 }}>Evaluación de la IA</h2>
              {rubrica?.ajuste != null && (
                <span style={{ fontSize: 24, fontWeight: 700 }}>
                  {rubrica.ajuste}
                  <span style={{ fontSize: 14, color: "var(--gris)", fontWeight: 500 }}>/100</span>
                </span>
              )}
            </div>
            {!rubrica ? (
              <span className="texto-gris">Sin evaluar todavía.</span>
            ) : (
              <>
                {rubrica.criterios.map((c) => (
                  <div key={c.nombre}>
                    <div className="fila-puntaje">
                      <span>
                        {c.nombre} <span className="texto-gris">({c.peso}%)</span>
                      </span>
                      <span className="num">{c.puntaje ?? "—"}</span>
                    </div>
                    <Barra valor={c.puntaje ?? 0} fina />
                    <div className="evidencia">{c.evidencia}</div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 12, fontSize: 13, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6 }}>
                  {rubrica.fortalezas && (
                    <span>
                      <b>Fortalezas:</b> {rubrica.fortalezas}
                    </span>
                  )}
                  {rubrica.profundizar && (
                    <span>
                      <b>Para profundizar en la entrevista:</b> {rubrica.profundizar}
                    </span>
                  )}
                  <span className="texto-gris" style={{ fontSize: 12 }}>
                    Con {rubrica.respuestasEvaluadas} respuestas · {fecha(rubrica.fecha)}. “—” es sin evidencia: no resta.
                  </span>
                </div>
              </>
            )}
            <EvaluarIa
              vacanteId={vacante.id}
              postulacionId={datos.id}
              hayNuevo={hayNuevo}
              yaEvaluada={Boolean(cv || rubrica)}
              enProceso={enProceso}
            />
          </div>

          <div className="tarjeta">
            <h2 style={{ fontSize: 16 }}>Tu decisión</h2>
            <DecisionPostulante
              vacanteId={vacante.id}
              postulacionId={datos.id}
              estado={datos.estado}
              etapaActual={datos.etapaActual}
              siguienteEtapa={datos.siguienteEtapa}
              puedeDecidir={sesion.rol === "gestion_humana"}
            />
            {datos.decisiones.length > 0 && (
              <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <b>Historial</b>
                {datos.decisiones.map((d) => (
                  <div key={d.fecha + d.etapa}>
                    <span className={d.resultado === "pasa" ? "est pasa" : "est no"}>{d.resultado === "pasa" ? "Pasa" : "No pasa"}</span>{" "}
                    {d.etapa} · {d.automatica ? "IA, requisitos mínimos" : "gestión humana"} · {fecha(d.fecha)}
                    {d.motivo && <div className="evidencia">{d.motivo}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
