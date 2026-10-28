"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Pestanas({ base, total }: { base: string; total: number }) {
  const ruta = usePathname();
  const pestanas = [
    { texto: "Requisitos", href: base, activa: ruta === base },
    { texto: "Rúbrica", href: `${base}/rubrica`, activa: ruta.startsWith(`${base}/rubrica`) },
    {
      texto: `Postulantes (${total.toLocaleString("es-CO")})`,
      href: `${base}/postulantes`,
      activa: ruta.startsWith(`${base}/postulantes`),
    },
  ];

  return (
    <nav className="pestanas" aria-label="Secciones de la vacante">
      {pestanas.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          className={p.activa ? "pestana on" : "pestana"}
          aria-current={p.activa ? "page" : undefined}
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
