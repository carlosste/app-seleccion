import Link from "next/link";
import { notFound } from "next/navigation";
import { Pestanas } from "@/components/pestanas";
import { obtenerVacante, vacantes } from "@/lib/datos-prueba";

// Con datos fijos, las rutas se generan en build. En Fase 2 (base de datos) se revisa.
export function generateStaticParams() {
  return vacantes.map((v) => ({ vacante: v.id }));
}

// Encabezado común de la vacante: título y pestañas Requisitos / Rúbrica / Postulantes.
export default async function LayoutVacante({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ vacante: string }>;
}) {
  const { vacante: id } = await params;
  const vacante = obtenerVacante(id);
  if (!vacante) notFound();

  return (
    <>
      <div>
        <Link href="/gestion" className="volver">
          ← Vacantes
        </Link>
        <h1 className="titulo-pagina">{vacante.cargo}</h1>
      </div>
      <Pestanas base={`/gestion/${vacante.id}`} total={vacante.postulados} />
      {children}
    </>
  );
}
