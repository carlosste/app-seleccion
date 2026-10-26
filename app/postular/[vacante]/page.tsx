import { cookies } from "next/headers";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";
import { vacantePorToken } from "@/lib/vacante-publica";
import { enviarCodigo } from "../acciones";

const MENSAJES: Record<string, string> = {
  datos: "Revisa tus datos. Nombre, correo, teléfono y documento son obligatorios, y debes aceptar el tratamiento de datos.",
  documento: "Ya existe una cuenta con ese documento. Ingresa con el correo que usaste antes.",
  correo: "No pudimos enviar el código. Revisa el correo e intenta de nuevo.",
  general: "Algo salió mal. Intenta de nuevo.",
};

// 1 · Postulación. Llega desde el link de la vacante (enlace_token).
export default async function Postulacion({
  params,
  searchParams,
}: {
  params: Promise<{ vacante: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { vacante: token } = await params;
  const { error } = await searchParams;
  const vacante = await vacantePorToken(token);
  const correoGuardado = (await cookies()).get("postulacion_correo")?.value;

  return (
    <>
      <div className="top">
        <EncabezadoEmpresa />
      </div>
      <div className="contenido">
        <div className="campo" style={{ gap: 6 }}>
          <span className="etq">Vacante</span>
          <h1 className="titulo-vacante">{vacante.cargo}</h1>
          {vacante.descripcion && <p className="texto-gris">{vacante.descripcion}</p>}
        </div>

        {error && MENSAJES[error] && (
          <div className="nota nota-na" role="alert">
            {MENSAJES[error]}
          </div>
        )}

        <form action={enviarCodigo} className="tarjeta tarjeta-compacta">
          <input type="hidden" name="token" value={token} />

          <div className="campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" name="nombre" className="inp" placeholder="Tu nombre" required minLength={3} />
          </div>
          <div className="campo">
            <label htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              name="correo"
              type="email"
              className="inp"
              placeholder="nombre@correo.com"
              required
              defaultValue={correoGuardado}
            />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" name="telefono" type="tel" className="inp" placeholder="300 000 0000" required minLength={7} />
          </div>
          <div className="campo">
            <label htmlFor="pais">País del documento</label>
            <input
              id="pais"
              name="pais"
              className="inp"
              placeholder="CO"
              required
              maxLength={2}
              pattern="[A-Za-z]{2}"
              title="Código de dos letras, por ejemplo CO"
            />
          </div>
          <div className="campo">
            <label htmlFor="documento">Número de documento</label>
            <input
              id="documento"
              name="documento"
              className="inp"
              placeholder="1234567890"
              required
              inputMode="numeric"
              pattern="[A-Za-z0-9.\- ]{5,20}"
            />
          </div>

          <div className="flex" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <input id="acepto" name="acepto" type="checkbox" required style={{ width: 20, height: 20, marginTop: 2 }} />
            <label htmlFor="acepto" style={{ fontSize: 12, lineHeight: 1.45, color: "var(--tx2)" }}>
              Acepto el tratamiento de mis datos y la grabación de mis respuestas (Ley 1581 de 2012).
            </label>
          </div>

          <button type="submit" className="btn">
            Enviar código
          </button>
        </form>

        <p className="texto-gris centrado">Te enviaremos un código a tu correo para continuar el proceso.</p>
      </div>
    </>
  );
}
