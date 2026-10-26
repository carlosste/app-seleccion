import Link from "next/link";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import { candidatoDetalle, postulantes } from "@/lib/datos-prueba";

// D · Postulantes a ciegas: sin nombres ni datos personales hasta la entrevista.
export default async function ListaPostulantes({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante } = await params;

  return (
    <>
      <div className="nota nota-az">
        Revisión a ciegas: nombres y datos personales ocultos hasta la entrevista. La IA ordena y puntúa; la decisión es de gestión humana.
      </div>

      <div className="flex">
        <span className="pill on">Todas</span>
        <span className="pill">Por revisar</span>
        <span className="pill">Preguntas por texto</span>
        <span className="pill">Preguntas por voz</span>
        <span className="pill">Entrevista</span>
      </div>

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
                  <b>Candidato #{p.id}</b>
                </td>
                <td>{p.etapa}</td>
                <td>
                  <div className="celda-ajuste">
                    <Barra valor={p.ajuste} />
                    <span className="num">{p.ajuste}</span>
                  </div>
                </td>
                <td>
                  <Estado decision={p.decision} />
                </td>
                <td style={{ textAlign: "right" }}>
                  {p.id === candidatoDetalle ? (
                    <Link href={`/gestion/${vacante}/postulantes/${p.id}`} style={{ fontWeight: 600 }}>
                      Ver respuestas
                    </Link>
                  ) : (
                    <span className="texto-gris">Sin datos de prueba</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="texto-gris">
        Ordenado por ajuste al cargo según la rúbrica. Los CVs que la IA no pudo leer bien quedan en &quot;Por revisar&quot;.
      </div>
    </>
  );
}
