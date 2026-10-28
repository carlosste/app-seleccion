import Link from "next/link";
import { CopiarLink } from "@/components/copiar-link";
import { Barra } from "@/components/barra";
import { QuitarVacante } from "@/components/gestion/quitar-vacante";
import { porcentaje } from "@/lib/datos-prueba";
import { listarVacantes } from "@/lib/gestion/datos";

// A · Inicio: vacantes de la empresa autenticada, con contadores por etapa.
export default async function Vacantes() {
  const vacantes = await listarVacantes();

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Vacantes activas</h1>
          <span className="texto-gris" style={{ fontSize: 14 }}>
            Cada vacante tiene su link de postulación, sus requisitos y su rúbrica.
          </span>
        </div>
        <Link href="/gestion/nueva" className="btn btn-chico" style={{ height: 44 }}>
          + Nueva vacante
        </Link>
      </div>

      {vacantes.length === 0 ? (
        <div className="tarjeta vacio">
          <h2 style={{ fontSize: 18 }}>Aún no tienes vacantes</h2>
          <span className="texto-gris">Cuando crees una vacante, aquí verás sus postulantes por etapa.</span>
        </div>
      ) : (
        <div className="grid-vac">
          {vacantes.map((v) => (
            <article key={v.id} className="tarjeta tarjeta-vacante">
              <div>
                <h2 style={{ fontSize: 18 }}>{v.cargo}</h2>
                <span className="texto-gris">{v.estado === "abierta" ? "Abierta" : "Borrador"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="etapa-fila">
                  <span>Postulados</span>
                  <Barra valor={v.postulados ? 100 : 0} />
                  <span className="num">{v.postulados.toLocaleString("es-CO")}</span>
                </div>
                <div className="etapa-fila">
                  <span>Preguntas por texto</span>
                  <Barra valor={porcentaje(v.alcanzaron.texto, v.postulados)} />
                  <span className="num">{v.alcanzaron.texto.toLocaleString("es-CO")}</span>
                </div>
                <div className="etapa-fila">
                  <span>Preguntas por voz</span>
                  <Barra valor={porcentaje(v.alcanzaron.voz, v.postulados)} />
                  <span className="num">{v.alcanzaron.voz.toLocaleString("es-CO")}</span>
                </div>
                <div className="etapa-fila">
                  <span>Entrevista</span>
                  <Barra valor={porcentaje(v.alcanzaron.entrevista, v.postulados)} />
                  <span className="num">{v.alcanzaron.entrevista.toLocaleString("es-CO")}</span>
                </div>
              </div>
              <div className="flex">
                <Link href={`/gestion/${v.id}`} className="btn btn-claro btn-ancho">
                  Abrir vacante
                </Link>
                {v.estado === "abierta" && <CopiarLink ruta={`/postular/${v.enlaceToken}`} />}
              </div>
              <QuitarVacante id={v.id} cargo={v.cargo} postulados={v.postulados} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
