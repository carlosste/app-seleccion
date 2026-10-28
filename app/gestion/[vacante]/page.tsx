import { DescripcionEditor } from "@/components/gestion/descripcion-editor";
import { EtapasEditor } from "@/components/gestion/etapas-editor";
import { RequisitosEditor } from "@/components/gestion/requisitos-editor";
import { listarEtapas, listarPreguntas, listarRequisitos } from "@/lib/gestion/configuracion";
import { obtenerVacante } from "@/lib/gestion/datos";

// B · Descripción, requisitos y etapas. Cada requisito tiene valor de la oferta (público) y mínimo (interno).
export default async function Requisitos({ params, searchParams }: PageProps<"/gestion/[vacante]">) {
  const { vacante: id } = await params;
  const { aviso } = await searchParams;
  const [vacante, requisitos, etapas, preguntas] = await Promise.all([
    obtenerVacante(id),
    listarRequisitos(id),
    listarEtapas(id),
    listarPreguntas(id),
  ]);

  return (
    <>
      {vacante && (
        <section className="tarjeta">
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Descripción de la oferta</h2>
            <span className="texto-gris" style={{ lineHeight: 1.45 }}>
              Es lo que ve el postulante en el link, junto con el cargo. Puedes pedirle un borrador a la IA y ajustarlo.
            </span>
          </div>
          <DescripcionEditor vacanteId={vacante.id} cargo={vacante.cargo} descripcion={vacante.descripcion} />
        </section>
      )}

      <section className="tarjeta">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Requisitos de la vacante</h2>
          <span className="texto-gris" style={{ lineHeight: 1.45 }}>
            Para cada requisito, escribe lo que pide la oferta y lo mínimo que aceptarías. El mínimo es interno: no lo ve el
            postulante.
          </span>
        </div>
        {aviso === "requisitos-ia" && (
          <div className="nota nota-na" role="status">
            La IA no respondió al crear la vacante: solo quedó la edad mínima. Usa “Sugerir con IA según el cargo” o agrega los
            requisitos a mano.
          </div>
        )}
        <RequisitosEditor vacanteId={id} requisitos={requisitos} />
      </section>

      <section className="tarjeta">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Etapas del proceso</h2>
          <span className="texto-gris">La empresa decide cuántas etapas tiene esta vacante, en qué orden y de qué tipo.</span>
        </div>
        <EtapasEditor vacanteId={id} etapas={etapas} preguntas={preguntas} />
      </section>
    </>
  );
}
