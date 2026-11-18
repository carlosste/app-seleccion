import Link from "next/link";
import { listarVacantesCerradas } from "@/lib/gestion/datos";
import { fechaCorta } from "@/lib/fecha";

// Vacantes cerradas: dejaron de recibir postulaciones, pero no se borran. Mismo formato de
// filas que Vacantes activas; cada una se abre para consultar sus postulantes, respuestas,
// evaluaciones y decisiones.
export default async function VacantesCerradas() {
  const vacantes = await listarVacantesCerradas();
  const n = (v: number) => v.toLocaleString("es-CO");

  return (
    <>
      <div className="panel-cabeza">
        <div className="panel-cabeza__texto">
          <nav className="miga" aria-label="Ruta">
            <Link href="/gestion">Vacantes</Link>
            <i aria-hidden="true">/</i>
            <span>Cerradas</span>
          </nav>
          <h1>Vacantes cerradas</h1>
          <p>Ya no reciben postulaciones. Se guardan con todos sus datos para que puedas consultarlas.</p>
        </div>
      </div>

      {vacantes.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>No tienes vacantes cerradas</h2>
          <span className="texto-gris">Cuando cierres una vacante con postulantes, aparecerá aquí en lugar de borrarse.</span>
        </div>
      ) : (
        <div className="superficie lista-vacantes">
          <div className="lista-filas__cabeza" aria-hidden="true">
            <span>Cargo</span>
            <span>Resultado</span>
            <span />
          </div>
          <ul className="lista-filas">
            {vacantes.map((v) => (
              <li key={v.id} className="fila-vacante">
                <div className="fila">
                  <div className="fila__principal">
                    <b>
                      <Link href={`/gestion/${v.id}/postulantes`}>{v.cargo}</Link>
                    </b>
                    <span className="chip-estado chip-estado--no">
                      {v.cerradaEl ? `Cerrada el ${fechaCorta(v.cerradaEl)}` : "Cerrada"}
                    </span>
                  </div>
                  <div className="embudo">
                    <div>
                      Postulados <b>{n(v.postulados)}</b>
                    </div>
                    <div>
                      Seleccionados <b>{n(v.seleccionados)}</b>
                    </div>
                  </div>
                  <div className="fila__acciones">
                    <Link href={`/gestion/${v.id}/postulantes`} className="btn btn-chico">
                      Ver postulantes
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
