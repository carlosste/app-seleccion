import Link from "next/link";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import { listarPostulantes } from "@/lib/gestion/datos";

// D · Postulantes a ciegas: sin nombres ni datos personales hasta la entrevista.
// Solo aparecen postulaciones de vacantes de la empresa de la sesión (RLS).
export default async function ListaPostulantes({ params }: PageProps<"/gestion/[vacante]/postulantes">) {
  const { vacante } = await params;
  const postulantes = await listarPostulantes(vacante);

  return (
    <>
      <div className="nota nota-az">
        Revisión a ciegas: nombres y datos personales ocultos hasta la entrevista. La IA ordena y puntúa; la decisión es de gestión humana.
      </div>

      {postulantes.length === 0 ? (
        <div className="tarjeta vacio">
          <h2 style={{ fontSize: 18 }}>Todavía no hay postulantes</h2>
          <span className="texto-gris">Comparte el link de la vacante para empezar a recibir hojas de vida.</span>
        </div>
      ) : (
        <div className="tarjeta tabla-caja" style={{ padding: 0 }}>
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Postulante</th>
                <th>Etapa</th>
                <th style={{ width: 260 }}>Ajuste al cargo (IA)</th>
                <th>Decisión</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {postulantes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>Candidato #{p.numero}</b>
                  </td>
                  <td>{p.etapa}</td>
                  <td>
                    {p.ajuste == null ? (
                      <span className="texto-gris">Sin evaluar</span>
                    ) : (
                      <div className="celda-ajuste">
                        <Barra valor={p.ajuste} />
                        <span className="num">{p.ajuste}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <Estado decision={p.decision} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/gestion/${vacante}/postulantes/${p.numero}`} style={{ fontWeight: 600 }}>
                      Ver respuestas
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="texto-gris">
        Ordenado por ajuste al cargo según la rúbrica. Los CVs que la IA no pudo leer bien quedan en &quot;Por revisar&quot;.
      </div>
    </>
  );
}
