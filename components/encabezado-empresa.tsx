// Nombre y logo de la empresa dueña de la vacante. Sin logo cargado, se muestra el recuadro.
export function EncabezadoEmpresa({
  nombre,
  logoUrl,
  grande = false,
}: {
  nombre: string;
  logoUrl?: string | null;
  grande?: boolean;
}) {
  return (
    <div className="empresa">
      {logoUrl ? (
        <img src={logoUrl} alt={`Logo de ${nombre}`} className={grande ? "logo logo-grande" : "logo"} />
      ) : (
        <div className={grande ? "logo logo-grande" : "logo"} aria-hidden="true">
          LOGO
        </div>
      )}
      <b>{nombre}</b>
    </div>
  );
}
