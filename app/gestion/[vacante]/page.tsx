import { EtapasEditor } from "@/components/gestion/etapas-editor";
import { RequisitosEditor } from "@/components/gestion/requisitos-editor";
import { listarEtapas, listarRequisitos } from "@/lib/gestion/configuracion";
import { obtenerVacante } from "@/lib/gestion/datos";
import { sugerenciasPara } from "@/lib/gestion/sugerencias";

// B · Requisitos y etapas. Cada requisito tiene valor de la oferta (público) y mínimo (interno).
export default async function Requisitos({ params }: PageProps<"/gestion/[vacante]">) {
  const { vacante: id } = await params;
  const vacante = await obtenerVacante(id);
  if (!vacante) return null;
  const [requisitos, etapas] = await Promise.all([listarRequisitos(id), listarEtapas(id)]);

  return (
    <>
      <section className="tarjeta">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Requisitos de la vacante</h2>
          <span className="texto-gris" style={{ lineHeight: 1.45 }}>
            Para cada requisito, escribe lo que pide la oferta y lo mínimo que aceptarías. El mínimo es interno: no lo ve el
            postulante.
          </span>
        </div>
        <RequisitosEditor vacanteId={id} requisitos={requisitos} sugerencias={sugerenciasPara(vacante.cargo)} />
      </section>

      <section className="tarjeta">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Etapas del proceso</h2>
          <span className="texto-gris">La empresa decide cuántas etapas tiene esta vacante, en qué orden y de qué tipo.</span>
        </div>
        <EtapasEditor vacanteId={id} etapas={etapas} />
      </section>
    </>
  );
}
