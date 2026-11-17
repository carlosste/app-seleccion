import { DescripcionEditor } from "@/components/gestion/descripcion-editor";
import { EtapasEditor } from "@/components/gestion/etapas-editor";
import { RequisitosEditor } from "@/components/gestion/requisitos-editor";
import { listarEtapas, listarPreguntas, listarRequisitos } from "@/lib/gestion/configuracion";
import { obtenerVacante } from "@/lib/gestion/datos";

// B · Descripción, requisitos y etapas. Cada requisito tiene valor de la oferta (público) y mínimo (interno).
// Tres bloques con su título y su frase en gris, separados por una línea fina (sin cajas dentro de cajas).
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
        <section className="bloque" aria-labelledby="h-descripcion">
          <div className="bloque__cabeza">
            <div>
              <h2 id="h-descripcion">Descripción de la oferta</h2>
              <p>Es lo que ve el postulante en el link, junto con el cargo. Puedes pedirle un borrador a la IA y ajustarlo.</p>
            </div>
          </div>
          <div className="superficie superficie--relleno">
            <DescripcionEditor vacanteId={vacante.id} cargo={vacante.cargo} descripcion={vacante.descripcion} />
          </div>
        </section>
      )}

      <section className="bloque" aria-labelledby="h-requisitos">
        <div className="bloque__cabeza">
          <div>
            <h2 id="h-requisitos">Requisitos de la vacante</h2>
            <p>
              Para cada requisito, escribe lo que pide la oferta y lo mínimo que aceptarías. El mínimo es interno: no lo ve el
              postulante.
            </p>
          </div>
        </div>
        {aviso === "requisitos-ia" && (
          <div className="nota nota-na" role="status">
            La IA no respondió al crear la vacante: solo quedó la edad mínima. Usa “Sugerir con IA según el cargo” o agrega los
            requisitos a mano.
          </div>
        )}
        <RequisitosEditor vacanteId={id} requisitos={requisitos} />
      </section>

      <section className="bloque" aria-labelledby="h-etapas">
        <div className="bloque__cabeza">
          <div>
            <h2 id="h-etapas">Etapas del proceso</h2>
            <p>La empresa decide cuántas etapas tiene esta vacante, en qué orden y de qué tipo.</p>
          </div>
        </div>
        <EtapasEditor vacanteId={id} etapas={etapas} preguntas={preguntas} />
      </section>
    </>
  );
}
