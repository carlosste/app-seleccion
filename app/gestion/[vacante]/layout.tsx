import Link from "next/link";
import { notFound } from "next/navigation";
import { Pestanas } from "@/components/pestanas";
import { obtenerVacante } from "@/lib/gestion/datos";

// Encabezado común de la vacante: título y pestañas Requisitos / Rúbrica / Postulantes.
// obtenerVacante filtra por la empresa de la sesión: si la vacante es de otra
// empresa (o no existe) responde 404, sin decir cuál de las dos.
export default async function LayoutVacante({ children, params }: LayoutProps<"/gestion/[vacante]">) {
  const { vacante: id } = await params;
  const vacante = await obtenerVacante(id);
  if (!vacante) notFound();

  return (
    <>
      <div>
        <Link href="/gestion" className="volver">
          ← Vacantes
        </Link>
        <h1 className="titulo-pagina">{vacante.cargo}</h1>
      </div>
      <Pestanas base={`/gestion/${vacante.id}`} total={vacante.total} />
      {children}
    </>
  );
}
