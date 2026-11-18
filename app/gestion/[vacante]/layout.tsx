import Link from "next/link";
import { notFound } from "next/navigation";
import { Pestanas } from "@/components/pestanas";
import { PublicarVacante } from "@/components/gestion/publicar-vacante";
import { listarEtapas } from "@/lib/gestion/configuracion";
import { NOMBRE_ETAPA, obtenerVacante } from "@/lib/gestion/datos";
import { fechaCorta } from "@/lib/fecha";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  abierta: { texto: "Abierta", clase: "chip-estado chip-estado--ok" },
  borrador: { texto: "Borrador", clase: "chip-estado chip-estado--neutro" },
  cerrada: { texto: "Cerrada", clase: "chip-estado chip-estado--no" },
};

// Marco común de la vacante: encabezado con el cargo y su estado, barra lateral con
// Requisitos / Rúbrica / Postulantes y las etapas, y el contenido de cada sección.
// obtenerVacante filtra por la empresa de la sesión: si la vacante es de otra
// empresa (o no existe) responde 404, sin decir cuál de las dos.
export default async function LayoutVacante({ children, params }: LayoutProps<"/gestion/[vacante]">) {
  const { vacante: id } = await params;
  const [vacante, etapas] = await Promise.all([obtenerVacante(id), listarEtapas(id)]);
  if (!vacante) notFound();
  const estado = ESTADO[vacante.estado] ?? ESTADO.borrador;

  return (
    <>
      <div className="panel-cabeza">
        <div className="panel-cabeza__texto">
          <nav className="miga" aria-label="Ruta">
            {vacante.estado === "cerrada" ? (
              <Link href="/gestion/cerradas">Vacantes cerradas</Link>
            ) : (
              <Link href="/gestion">Vacantes</Link>
            )}
            <i aria-hidden="true">/</i>
            <span>{vacante.cargo}</span>
          </nav>
          <h1>{vacante.cargo}</h1>
        </div>
        <span className={estado.clase}>{estado.texto}</span>
      </div>

      <div className="vacante-marco">
        <Pestanas
          base={`/gestion/${vacante.id}`}
          total={vacante.total}
          etapas={etapas.map((e) => ({
            id: e.id,
            tipo: e.tipo,
            nombre: e.nombre?.trim() || NOMBRE_ETAPA[e.tipo],
            llegaron: e.llegaron,
          }))}
        />
        <div className="vacante-contenido">
          {vacante.estado === "cerrada" && (
            <div className="nota nota-az">
              <b>Vacante cerrada{vacante.cerradaEl ? ` el ${fechaCorta(vacante.cerradaEl)}` : ""}.</b> Ya no recibe
              postulaciones; se guarda con sus postulantes, respuestas y decisiones para consultarla.
            </div>
          )}
          <PublicarVacante id={vacante.id} estado={vacante.estado} enlaceToken={vacante.enlaceToken} />
          {children}
        </div>
      </div>
    </>
  );
}
