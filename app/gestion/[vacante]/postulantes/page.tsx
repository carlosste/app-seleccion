import Link from "next/link";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import { AnalizarTodos } from "@/components/gestion/analizar-todos";
import { listarPostulantes } from "@/lib/gestion/datos";

// D · Postulantes: cada uno con su código (#014) para ubicarlo rápido entre muchos.
// Hoy la vista de la base todavía oculta nombre y contacto hasta la entrevista.
// Solo aparecen postulaciones de vacantes de la empresa de la sesión (RLS).
// Una fila por candidato, como la ventana del inicio: número, etapa, ajuste y estado.
export default async function ListaPostulantes({ params }: PageProps<"/gestion/[vacante]/postulantes">) {
  const { vacante } = await params;
  const postulantes = await listarPostulantes(vacante);

  return (
    <section className="bloque" aria-labelledby="h-postulantes">
      <div className="bloque__cabeza">
        <div>
          <h2 id="h-postulantes">Postulantes</h2>
          <p>
            Cada postulante tiene un código para ubicarlo rápido. Ordenados por ajuste al cargo según la rúbrica; la decisión es
            de gestión humana.
          </p>
        </div>
      </div>

      <AnalizarTodos
        vacanteId={vacante}
        postulantes={postulantes.filter((p) => p.decision === "pendiente").map((p) => ({ id: p.id, numero: p.numero }))}
      />

      {postulantes.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>Todavía no hay postulantes</h2>
          <span className="texto-gris">Comparte el link de la vacante para empezar a recibir hojas de vida.</span>
        </div>
      ) : (
        <div className="superficie lista-postulantes">
          <div className="lista-filas__cabeza" aria-hidden="true">
            <span />
            <span>Candidato</span>
            <span>Etapa</span>
            <span>Ajuste al cargo (IA)</span>
            <span>Decisión</span>
            <span />
          </div>
          <ul className="lista-filas">
            {postulantes.map((p) => (
              <li key={p.id}>
                <Link href={`/gestion/${vacante}/postulantes/${p.numero}`} className="fila">
                  <span className="avatar-num" aria-hidden="true">
                    {p.numero}
                  </span>
                  <span className="fila__principal">
                    <b>Candidato #{p.numero}</b>
                    {p.sospecha ? (
                      <span className="fila__alerta" title="La IA o el servidor vieron un posible intento de manipular la evaluación">
                        Revisar a mano: posible manipulación
                      </span>
                    ) : (
                      <small>Ver respuestas y evidencia</small>
                    )}
                  </span>
                  <span className="fila__etapa">{p.etapa}</span>
                  <span className="fila__ajuste">
                    {p.ajuste == null ? (
                      <span className="texto-gris">Sin evaluar</span>
                    ) : (
                      <>
                        <span className="num">{p.ajuste}</span>
                        <Barra valor={p.ajuste} fina />
                      </>
                    )}
                  </span>
                  <span className="fila__chip">
                    <Estado decision={p.decision} />
                  </span>
                  <svg className="fila__flecha" viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                    <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <span className="texto-gris">Los CVs que la IA no pudo leer bien quedan en &quot;Por revisar&quot;: nunca se descartan solos.</span>
    </section>
  );
}
