import Link from "next/link";
import { listarVacantesCerradas } from "@/lib/gestion/datos";
import { fechaCorta } from "@/lib/fecha";

// Vacantes cerradas: dejaron de recibir postulaciones, pero no se borran. Desde aquí se
// abre cada una para consultar sus postulantes, respuestas, evaluaciones y decisiones.
export default async function VacantesCerradas() {
  const vacantes = await listarVacantesCerradas();

  return (
    <>
      <div>
        <Link href="/gestion" className="volver">
          ← Vacantes activas
        </Link>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Vacantes cerradas</h1>
        <span className="texto-gris" style={{ fontSize: 14 }}>
          Ya no reciben postulaciones. Se guardan con todos sus datos para que puedas consultarlas.
        </span>
      </div>

      {vacantes.length === 0 ? (
        <div className="tarjeta vacio">
          <h2 style={{ fontSize: 18 }}>No tienes vacantes cerradas</h2>
          <span className="texto-gris">
            Cuando cierres una vacante con postulantes, aparecerá aquí en lugar de borrarse.
          </span>
        </div>
      ) : (
        <div className="tarjeta tabla-caja" style={{ padding: 0 }}>
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Cerrada el</th>
                <th>Postulantes</th>
                <th>Seleccionados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vacantes.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.cargo}</b>
                  </td>
                  <td>{v.cerradaEl ? fechaCorta(v.cerradaEl) : <span className="texto-gris">Sin fecha</span>}</td>
                  <td className="num">{v.postulados.toLocaleString("es-CO")}</td>
                  <td className="num">{v.seleccionados.toLocaleString("es-CO")}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/gestion/${v.id}/postulantes`} style={{ fontWeight: 600 }}>
                      Ver postulantes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
