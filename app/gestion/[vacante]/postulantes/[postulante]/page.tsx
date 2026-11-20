import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { DecisionPostulante } from "@/components/gestion/decision-postulante";
import { EntrevistaPostulante } from "@/components/gestion/entrevista-postulante";
import { EvaluarIa } from "@/components/gestion/evaluar-ia";
import { RespuestasPostulante } from "@/components/gestion/respuestas-postulante";
import { VisorCv } from "@/components/gestion/visor-cv";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";
import { obtenerPostulante } from "@/lib/gestion/datos";
import { type EstadoRequisito, type VeredictoCv, VERSION_PUNTAJE } from "@/lib/gestion/tipos-evaluacion";

const VEREDICTO: Record<VeredictoCv, { texto: string; color: string }> = {
  cumple: { texto: "Cumple", color: "var(--verde-tx)" },
  no_cumple: { texto: "No cumple", color: "var(--naranja)" },
  por_revisar: { texto: "Por revisar", color: "var(--tx2)" },
};

const REQUISITO: Record<EstadoRequisito, { texto: string; clase: string }> = {
  cumple: { texto: "Cumple", clase: "chip-estado chip-estado--ok" },
  no_cumple: { texto: "No cumple", clase: "chip-estado chip-estado--no" },
  no_se_sabe: { texto: "Sin dato", clase: "chip-estado chip-estado--revisar" },
};

// Analizar una entrevista de una hora puede tardar más de un minuto (lib/gestion/entrevista.ts).
export const maxDuration = 120;

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

// E · Detalle del postulante: respuestas con la evidencia marcada, CV sin datos personales,
// evaluación de la IA por etapa y decisión. Dos columnas: el contenido a la izquierda y, fija a
// la derecha, el total, las etapas, la decisión y el historial.
// La postulación se busca con la sesión de la empresa: si es de otra empresa, 404.
export default async function DetallePostulante({ params }: PageProps<"/gestion/[vacante]/postulantes/[postulante]">) {
  const { vacante: idVacante, postulante: numero } = await params;
  const [datos, sesion] = await Promise.all([obtenerPostulante(idVacante, numero), requerirEmpresa()]);
  if (!datos) notFound();
  const { vacante, cv, rubrica } = datos;
  const enProceso = datos.estado === "en_proceso";
  // Una evaluación del formato anterior (sin etapas) también se puede rehacer por etapa.
  // También si alguna etapa se calificó con un criterio anterior (VERSION_PUNTAJE).
  const hayNuevo =
    !cv ||
    Boolean(rubrica?.anterior) ||
    datos.totalRespuestas !== (rubrica?.respuestasEvaluadas ?? 0) ||
    Boolean(rubrica?.etapas.some((e) => e.version !== VERSION_PUNTAJE));
  // Cada etapa con su puntaje y, aparte, el total: promedio de las etapas, entrevista incluida.
  const filasEtapas = [
    ...(rubrica && !rubrica.anterior ? rubrica.etapas.map((e) => ({ id: e.etapaId, nombre: e.nombre, ajuste: e.ajuste })) : []),
    ...(datos.analisisEntrevista
      ? [{ id: "entrevista", nombre: datos.analisisEntrevista.nombre, ajuste: datos.analisisEntrevista.ajuste }]
      : []),
  ];
  const variasEtapas = filasEtapas.length > 1;

  return (
    <>
      <div className="panel-cabeza">
        <div className="panel-cabeza__texto">
          <nav className="miga" aria-label="Ruta">
            <Link href={`/gestion/${vacante.id}/postulantes`}>Postulantes</Link>
            <i aria-hidden="true">/</i>
            <span>#{datos.numero}</span>
          </nav>
          <h2 className="titulo-candidato">{datos.revelado && datos.nombre ? datos.nombre : `Candidato #${datos.numero}`}</h2>
        </div>
        <div className="flex">
          {!datos.revelado && <span className="chip-estado chip-estado--neutro">Nombre oculto hasta la entrevista</span>}
          <VisorCv postulacionId={datos.id} numero={datos.numero} tieneCv={datos.tieneCv} />
        </div>
      </div>

      <div className="detalle-marco">
        <div className="detalle-principal">
          <section className="superficie superficie--relleno" aria-labelledby="h-respuestas">
            <h2 id="h-respuestas">Respuestas por etapa</h2>
            <RespuestasPostulante grupos={datos.grupos} evaluaciones={rubrica && !rubrica.anterior ? rubrica.etapas : []} />
          </section>

          {(datos.hayEtapaEntrevista || datos.entrevista || datos.analisisEntrevista) && (
            <section className="superficie superficie--relleno" aria-labelledby="h-entrevista">
              <h2 id="h-entrevista">Entrevista</h2>
              <EntrevistaPostulante
                vacanteId={vacante.id}
                postulacionId={datos.id}
                guardada={datos.entrevista}
                analisis={datos.analisisEntrevista}
              />
            </section>
          )}

          <section className="superficie superficie--relleno" aria-labelledby="h-cv">
            <h2 id="h-cv">Hoja de vida (sin datos personales)</h2>
            {!cv ? (
              <span className="texto-gris">Sin analizar. Usa “Evaluar con IA” para leerla y revisar los requisitos mínimos.</span>
            ) : (
              <>
                <div className="datos-cv">
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
                  <div className="requisitos-cv">
                    {cv.requisitos.map((q) => (
                      <div key={q.requisito + q.minimo} className="requisito-cv">
                        <div className="requisito-cv__fila">
                          <span>
                            <b>{q.requisito}</b> · mínimo: {q.minimo}
                          </span>
                          <span className={REQUISITO[q.estado].clase}>{REQUISITO[q.estado].texto}</span>
                        </div>
                        <div className="criterio__cita">{q.evidencia}</div>
                      </div>
                    ))}
                  </div>
                )}
                {cv.sospecha && (
                  <div className="nota nota-error" role="alert">
                    <span>
                      <b>Posible intento de manipular la lectura de la hoja de vida:</b> no avanzó ni se descartó sola. Ábrela y
                      revisa los requisitos a mano.{cv.motivoSospecha && <> Motivo: {cv.motivoSospecha}</>}
                    </span>
                  </div>
                )}
                {cv.veredicto === "por_revisar" && !cv.sospecha && (
                  <span className="texto-gris">La IA no encontró algún dato: no se descarta. Revisa y decide tú.</span>
                )}
                <span className="texto-gris">
                  Analizada por la IA el {fecha(cv.fecha)} · Los requisitos mínimos no los ve el postulante.
                </span>
              </>
            )}
          </section>
        </div>

        <aside className="detalle-lateral">
          <section className="superficie superficie--relleno" aria-labelledby="h-evaluacion">
            <h2 id="h-evaluacion">Evaluación de la IA</h2>
            {rubrica?.anterior && (
              <span className="texto-gris">
                Esta evaluación se hizo antes de separar por etapa. Usa el botón para verla etapa por etapa.
              </span>
            )}
            {filasEtapas.length === 0 && !rubrica?.anterior ? (
              <span className="texto-gris">Sin evaluar todavía.</span>
            ) : (
              <>
                {/* Una barra por etapa con su puntaje; abajo, el total. */}
                {filasEtapas.map((e) => (
                  <div key={e.id} className="etapa-puntaje">
                    <div className="etapa-puntaje__fila">
                      <span>{e.nombre}</span>
                      <span className="num">{e.ajuste ?? "—"}</span>
                    </div>
                    <Barra valor={e.ajuste ?? 0} fina />
                  </div>
                ))}
                {datos.ajusteTotal != null && (
                  <div className="total-ia">
                    <b>{datos.ajusteTotal}</b>
                    <span>de 100 · total{variasEtapas ? ", promedio de las etapas" : ""}</span>
                  </div>
                )}
                <span className="texto-gris">El detalle de cada etapa está en su pestaña de respuestas y en Entrevista.</span>
              </>
            )}
            <EvaluarIa
              vacanteId={vacante.id}
              postulacionId={datos.id}
              hayNuevo={hayNuevo}
              yaEvaluada={Boolean(cv || rubrica)}
              enProceso={enProceso}
            />
          </section>

          <section className="superficie superficie--relleno" aria-labelledby="h-decision">
            <h2 id="h-decision">Tu decisión</h2>
            <DecisionPostulante
              vacanteId={vacante.id}
              postulacionId={datos.id}
              estado={datos.estado}
              etapaActual={datos.etapaActual}
              siguienteEtapa={datos.siguienteEtapa}
              puedeDecidir={sesion.rol === "gestion_humana"}
            />
            {datos.decisiones.length > 0 && (
              <div className="historial">
                <span className="etiqueta-sec">Historial</span>
                {datos.decisiones.map((d) => (
                  <div key={d.fecha + d.etapa} className="historial__item">
                    <span>
                      <span className={d.resultado === "pasa" ? "chip-estado chip-estado--ok" : "chip-estado chip-estado--no"}>
                        {d.resultado === "pasa" ? "Pasa" : "No pasa"}
                      </span>{" "}
                      {d.etapa}
                    </span>
                    <span className="texto-gris">
                      {d.automatica ? "IA, requisitos mínimos" : "Gestión humana"} · {fecha(d.fecha)}
                    </span>
                    {d.motivo && <span className="criterio__cita">{d.motivo}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
