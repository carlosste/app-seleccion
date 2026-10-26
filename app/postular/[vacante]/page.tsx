import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerVacante } from "@/lib/datos-prueba";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";

// 1 · Postulación. Llega desde el link de la vacante.
export default async function Postulacion({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: id } = await params;
  const vacante = obtenerVacante(id);
  if (!vacante) notFound();

  return (
    <>
      <div className="top">
        <EncabezadoEmpresa />
      </div>
      <div className="contenido">
        <div className="campo" style={{ gap: 6 }}>
          <span className="etq">Vacante</span>
          <h1 className="titulo-vacante">{vacante.cargo}</h1>
          <div className="flex">
            {vacante.chips.map((chip) => (
              <span key={chip} className="chip">
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Sin <form>: en Fase 1 no se envía nada, y un GET dejaría datos personales en la URL. */}
        <div className="tarjeta tarjeta-compacta">
          <div className="campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" className="inp" placeholder="Tu nombre" />
          </div>
          <div className="campo">
            <label htmlFor="correo">Correo electrónico</label>
            <input id="correo" type="email" className="inp" placeholder="nombre@correo.com" />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" type="tel" className="inp" placeholder="300 000 0000" />
          </div>
          <div className="campo">
            <label>Hoja de vida (PDF)</label>
            <div
              style={{
                border: "1.5px dashed #9AA3B0",
                borderRadius: 8,
                padding: 14,
                color: "var(--gris)",
                fontSize: 14,
              }}
            >
              Toca para subir tu CV
            </div>
          </div>
          <div className="flex" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <input id="acepto" type="checkbox" style={{ width: 20, height: 20, marginTop: 2 }} />
            <label htmlFor="acepto" style={{ fontSize: 12, lineHeight: 1.45, color: "var(--tx2)" }}>
              Acepto el tratamiento de mis datos y la grabación de mis respuestas (Ley 1581 de 2012).
            </label>
          </div>
          <Link href={`/postular/${vacante.id}/ingreso`} className="btn">
            Enviar postulación
          </Link>
        </div>

        <p className="texto-gris centrado">Te enviaremos un código a tu correo para continuar el proceso.</p>
      </div>
    </>
  );
}
