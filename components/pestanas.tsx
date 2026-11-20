"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type EtapaLateral = { id: string; tipo: string; nombre: string; enEtapa: number };

const ICONOS = {
  requisitos: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 2.5h5l3 3v8H4z" />
      <path d="M6 8h4M6 10.5h4" />
    </svg>
  ),
  rubrica: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M3 12.5V9M6.5 12.5V5M10 12.5V7.5M13.5 12.5V3.5" />
    </svg>
  ),
  postulantes: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="6" r="2.5" />
      <path d="M3.5 13.5c.6-2.3 2.4-3.5 4.5-3.5s3.9 1.2 4.5 3.5" />
    </svg>
  ),
};

// Barra lateral de la vacante (como la ventana del inicio): Requisitos, Rúbrica y Postulantes,
// y debajo las etapas con su color y cuántos siguen en proceso en cada una (igual que el filtro). En tableta y
// celular la hoja de estilos la pone arriba como una fila de pestañas.
export function Pestanas({ base, total, etapas = [] }: { base: string; total: number; etapas?: EtapaLateral[] }) {
  const ruta = usePathname();
  const etapaActiva = useSearchParams().get("etapa");
  const secciones = [
    { texto: "Requisitos", href: base, activa: ruta === base, icono: ICONOS.requisitos, cuenta: null },
    { texto: "Rúbrica", href: `${base}/rubrica`, activa: ruta.startsWith(`${base}/rubrica`), icono: ICONOS.rubrica, cuenta: null },
    {
      texto: "Postulantes",
      href: `${base}/postulantes`,
      activa: ruta.startsWith(`${base}/postulantes`),
      icono: ICONOS.postulantes,
      cuenta: total.toLocaleString("es-CO"),
    },
  ];

  return (
    <nav className="lateral" aria-label="Secciones de la vacante">
      {secciones.map((s) => (
        <Link key={s.href} href={s.href} className="lateral__item" aria-current={s.activa ? "page" : undefined}>
          {s.icono}
          {s.texto}
          {s.cuenta != null && <em>{s.cuenta}</em>}
        </Link>
      ))}
      {etapas.length > 0 && (
        <>
          <span className="lateral__titulo">Etapas</span>
          {/* Cada etapa abre la lista de postulantes filtrada en esa etapa. */}
          {etapas.map((e) => (
            <Link
              key={e.id}
              href={`${base}/postulantes?etapa=${e.id}`}
              className="lateral__etapa"
              data-tipo={e.tipo}
              aria-current={ruta === `${base}/postulantes` && etapaActiva === e.id ? "true" : undefined}
              title={`${e.nombre}: ${e.enEtapa} en proceso en esta etapa`}
            >
              <i aria-hidden="true" />
              <span>{e.nombre}</span>
              <em>{e.enEtapa.toLocaleString("es-CO")}</em>
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
