import Link from "next/link";
import { empresa } from "@/lib/datos-prueba";

export function NavGestion() {
  return (
    <header className="nav">
      <div className="marca">
        <div className="logo">LOGO</div>
        {empresa.nombre} · Selección
      </div>
      <nav className="nav-links">
        <Link href="/gestion">Vacantes</Link>
        <span>Gestión humana</span>
      </nav>
    </header>
  );
}
