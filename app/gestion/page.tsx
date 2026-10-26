import Link from "next/link";
import { CopiarLink } from "@/components/copiar-link";
import { Barra } from "@/components/barra";
import { porcentaje, vacantes } from "@/lib/datos-prueba";

// A · Inicio: vacantes activas con contadores por etapa.
export default function Vacantes() {
  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Vacantes activas</h1>
          <span className="texto-gris" style={{ fontSize: 14 }}>
            Cada vacante tiene su link de postulación, sus requisitos y su rúbrica.
          </span>
        </div>
        <button type="button" className="btn btn-chico" style={{ height: 44 }}>
          + Nueva vacante
        </button>
      </div>

      <div className="grid-vac">
        {vacantes.map((v) => (
          <article key={v.id} className="tarjeta tarjeta-vacante">
            <div>
              <h2 style={{ fontSize: 18 }}>{v.cargo}</h2>
              <span className="texto-gris">Código vence en {v.vencimientoCodigo}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="etapa-fila">
                <span>Postulados</span>
                <Barra valor={100} />
                <span className="num">{v.postulados.toLocaleString("es-CO")}</span>
              </div>
              <div className="etapa-fila">
                <span>Preguntas por texto</span>
                <Barra valor={porcentaje(v.textos, v.postulados)} />
                <span className="num">{v.textos.toLocaleString("es-CO")}</span>
              </div>
              <div className="etapa-fila">
                <span>Preguntas por voz</span>
                <Barra valor={porcentaje(v.voz, v.postulados)} />
                <span className="num">{v.voz.toLocaleString("es-CO")}</span>
              </div>
              <div className="etapa-fila">
                <span>Entrevista</span>
                <Barra valor={porcentaje(v.entrevista, v.postulados)} />
                <span className="num">{v.entrevista.toLocaleString("es-CO")}</span>
              </div>
            </div>
            <div className="flex">
              <Link href={`/gestion/${v.id}`} className="btn btn-claro btn-ancho">
                Abrir vacante
              </Link>
              <CopiarLink ruta={`/postular/${v.id}`} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
