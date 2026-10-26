import { empresa } from "@/lib/datos-prueba";

// Logo de la empresa: en la app real será el logo que cargue cada empresa.
export function EncabezadoEmpresa({ grande = false }: { grande?: boolean }) {
  return (
    <div className="empresa">
      <div className={grande ? "logo logo-grande" : "logo"}>LOGO</div>
      <b>{empresa.nombre}</b>
    </div>
  );
}
