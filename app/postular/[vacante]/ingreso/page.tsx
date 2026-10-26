import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerVacante } from "@/lib/datos-prueba";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";

// 2 · Ingreso con código. Sin registro tradicional.
export default async function Ingreso({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: id } = await params;
  const vacante = obtenerVacante(id);
  if (!vacante) notFound();

  return (
    <div className="contenido" style={{ padding: "48px 24px", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <EncabezadoEmpresa grande />
      </div>

      <div className="centrado">
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Ingresa a tu proceso</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--gris)" }}>
          Usa el código que te enviamos al correo. La primera vez, crea tu contraseña.
        </p>
      </div>

      {/* Sin <form>: en Fase 1 no se envía nada. */}
      <div className="tarjeta">
        <div className="campo">
          <label htmlFor="codigo">Código de acceso</label>
          <input id="codigo" className="inp" placeholder="ABC-1234" style={{ height: 48, fontSize: 18, letterSpacing: "0.12em" }} />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <input id="clave" type="password" className="inp" placeholder="••••••••" style={{ height: 48 }} />
        </div>
        <Link href={`/postular/${vacante.id}/preguntas`} className="btn">
          Ingresar
        </Link>
        <a href="#" className="centrado" style={{ fontSize: 13 }}>
          ¿No te llegó el código? Reenviar
        </a>
      </div>

      <div className="nota nota-na">Tu código vence en {vacante.vencimientoCodigo}.</div>
    </div>
  );
}
