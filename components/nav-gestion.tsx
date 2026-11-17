import Link from "next/link";
import { Marca } from "@/components/marca";
import { cerrarSesion } from "@/lib/auth/acciones";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";

// Barra superior del panel, como la del inicio: blanca, con línea fina, la marca de la
// plataforma, la empresa de la sesión, el enlace a Vacantes y el usuario.
export async function NavGestion() {
  const { empresa, nombre, correo } = await requerirEmpresa();
  return (
    <header className="panel-barra">
      <div className="panel-barra__interior">
        <Marca />
        <span className="panel-barra__empresa">{empresa.nombre}</span>
        <nav className="panel-barra__enlaces" aria-label="Panel">
          <Link href="/gestion" className="panel-barra__enlace">
            Vacantes
          </Link>
        </nav>
        <div className="panel-barra__usuario">
          <span>{nombre ?? correo}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="btn-enlace">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function NavGestionEsqueleto() {
  return (
    <header className="panel-barra">
      <div className="panel-barra__interior">
        <Marca />
      </div>
    </header>
  );
}
