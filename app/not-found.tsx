import Link from "next/link";
import { Marca } from "@/components/marca";

export const metadata = { title: "Página no encontrada · Selección" };

// 404 propia: la de Next.js sale en negro y en inglés. Sirve también para un link de vacante
// que ya no existe o está mal copiado.
export default function NoEncontrada() {
  return (
    <main className="auth-pantalla">
      <div className="auth-columna">
        <Marca />
        <section className="tarjeta auth-tarjeta">
          <div className="auth-cabecera">
            <h1>No encontramos esta página</h1>
            <p className="texto-gris">
              Si llegaste por el link de una vacante, revisa que esté completo: puede que la empresa la haya
              cerrado o que el link se haya cortado al copiarlo.
            </p>
          </div>
          <Link href="/" className="btn">
            Ir al inicio
          </Link>
        </section>
      </div>
    </main>
  );
}
