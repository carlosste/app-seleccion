import Link from "next/link";
import { CopiarLink } from "@/components/copiar-link";
import { QuitarVacante } from "@/components/gestion/quitar-vacante";
import { listarVacantes } from "@/lib/gestion/datos";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  abierta: { texto: "Abierta", clase: "chip-estado chip-estado--ok" },
  borrador: { texto: "Borrador", clase: "chip-estado chip-estado--neutro" },
};

// A · Inicio del panel: vacantes de la empresa autenticada, una fila por vacante con su estado,
// cuántos postulantes llegaron a cada etapa y sus acciones.
export default async function Vacantes() {
  const vacantes = await listarVacantes();
  const n = (v: number) => v.toLocaleString("es-CO");

  return (
    <>
      <div className="panel-cabeza">
        <div className="panel-cabeza__texto">
          <h1>Vacantes activas</h1>
          <p>
            Cada vacante tiene su link de postulación, sus requisitos y su rúbrica.{" "}
            <Link href="/gestion/cerradas">Ver vacantes cerradas</Link>
          </p>
        </div>
        <Link href="/gestion/nueva" className="btn">
          Crear vacante
        </Link>
      </div>

      {vacantes.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>Aún no tienes vacantes</h2>
          <span className="texto-gris">Cuando crees una vacante, aquí verás sus postulantes por etapa.</span>
        </div>
      ) : (
        <div className="superficie lista-vacantes">
          <div className="lista-filas__cabeza" aria-hidden="true">
            <span>Cargo</span>
            <span>Postulantes por etapa</span>
            <span />
          </div>
          <ul className="lista-filas">
            {vacantes.map((v) => {
              const estado = ESTADO[v.estado] ?? ESTADO.borrador;
              return (
                <li key={v.id} className="fila-vacante">
                  <div className="fila">
                    <div className="fila__principal">
                      <b>
                        <Link href={`/gestion/${v.id}`}>{v.cargo}</Link>
                      </b>
                      <span className={estado.clase}>
                        {estado.texto}
                      </span>
                    </div>
                    <div className="embudo">
                      <div>
                        Postulados <b>{n(v.postulados)}</b>
                      </div>
                      <div>
                        Texto <b>{n(v.alcanzaron.texto)}</b>
                      </div>
                      <div>
                        Voz <b>{n(v.alcanzaron.voz)}</b>
                      </div>
                      <div>
                        Entrevista <b>{n(v.alcanzaron.entrevista)}</b>
                      </div>
                    </div>
                    <div className="fila__acciones">
                      {v.estado === "abierta" && <CopiarLink ruta={`/postular/${v.enlaceToken}`} />}
                      <Link href={`/gestion/${v.id}`} className="btn btn-chico">
                        Abrir vacante
                      </Link>
                    </div>
                  </div>
                  <div className="fila-vacante__quitar">
                    <QuitarVacante id={v.id} cargo={v.cargo} postulados={v.postulados} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
