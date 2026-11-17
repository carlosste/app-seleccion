import Link from "next/link";
import { FormularioVacante } from "@/components/gestion/formulario-vacante";

export const metadata = { title: "Nueva vacante · Selección" };

// Crear una vacante: cargo y descripción. Queda en borrador y con sus etapas por defecto.
export default function NuevaVacante() {
  return (
    <>
      <div className="panel-cabeza">
        <div className="panel-cabeza__texto">
          <nav className="miga" aria-label="Ruta">
            <Link href="/gestion">Vacantes</Link>
            <i aria-hidden="true">/</i>
            <span>Nueva</span>
          </nav>
          <h1>Nueva vacante</h1>
          <p>Queda en borrador con sus etapas por defecto; la IA propone los requisitos del cargo.</p>
        </div>
      </div>
      <section className="superficie superficie--relleno" style={{ maxWidth: 680 }}>
        <FormularioVacante />
      </section>
    </>
  );
}
