import Link from "next/link";

// Marca de la plataforma: los cuatro puntos y el nombre, igual que en el inicio (public/inicio).
// Lleva a "/", la página de inicio para empresas. Las pantallas del postulante no la usan: ahí
// manda la marca de la empresa dueña de la vacante (EncabezadoEmpresa).
export function Marca() {
  return (
    <Link href="/" className="marca-plataforma" aria-label="Selección">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
        <circle cx="6.5" cy="6.5" r="4.5" />
        <circle cx="17.5" cy="6.5" r="4.5" />
        <circle cx="6.5" cy="17.5" r="4.5" />
        <rect x="13" y="13" width="9" height="9" rx="1.5" />
      </svg>
      <span className="marca-plataforma__texto">Selección</span>
    </Link>
  );
}
