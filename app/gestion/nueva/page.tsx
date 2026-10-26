import Link from "next/link";
import { FormularioVacante } from "@/components/gestion/formulario-vacante";

export const metadata = { title: "Nueva vacante · Selección" };

// Crear una vacante: cargo y descripción. Queda en borrador y con sus etapas por defecto.
export default function NuevaVacante() {
  return (
    <>
      <Link href="/gestion" className="volver">
        ← Vacantes
      </Link>
      <h1 className="titulo-pagina">Nueva vacante</h1>
      <section className="tarjeta auth-tarjeta-ancha">
        <FormularioVacante />
      </section>
    </>
  );
}
