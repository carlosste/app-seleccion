import Link from "next/link";
import { cerrarSesion } from "@/lib/auth/acciones";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";

// Barra superior del panel con la empresa y el usuario de la sesión actual.
export async function NavGestion() {
  const { empresa, nombre, correo } = await requerirEmpresa();
  return (
    <header className="nav">
      <div className="marca">
        <div className="logo">LOGO</div>
        {empresa.nombre} · Selección
      </div>
      <nav className="nav-links">
        <Link href="/gestion">Vacantes</Link>
        <span className="nav-usuario">
          {nombre ?? correo}
          <form action={cerrarSesion}>
            <button type="submit" className="btn-enlace">
              Cerrar sesión
            </button>
          </form>
        </span>
      </nav>
    </header>
  );
}

export function NavGestionEsqueleto() {
  return (
    <header className="nav">
      <div className="marca">
        <div className="logo">LOGO</div>
        Selección
      </div>
    </header>
  );
}
