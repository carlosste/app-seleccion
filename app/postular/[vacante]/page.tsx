import Link from "next/link";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";
import { vacantePorToken } from "@/lib/vacante-publica";
import { postularse } from "../acciones";

const MENSAJES: Record<string, string> = {
  datos:
    "Revisa tus datos. Nombre, correo, teléfono y documento (de 6 a 20 letras o números) son obligatorios, y debes aceptar el tratamiento de datos.",
  cv: "Sube tu hoja de vida en PDF (un PDF real, no otro archivo renombrado), de máximo 4 MB.",
  documento: "Ya existe una cuenta con ese documento y otro correo. Escribe el correo que usaste la primera vez.",
  "correo-documento": "Ese correo ya tiene una cuenta con otro documento. Revisa el número de documento.",
  "correo-registrado": "Ese correo ya está registrado en otra cuenta. Usa otro correo.",
  empresa: "Ese correo es de una cuenta de empresa. Para postularte usa tu correo personal.",
  limite: "Esta empresa ya no recibe más postulaciones por ahora.",
  "limite-intentos": "Hubo demasiadas postulaciones desde tu red. Intenta de nuevo en una hora.",
  "sin-postulacion": "Aún no te has postulado a esta vacante. Llena el formulario y sube tu hoja de vida.",
  sesion: "Tu sesión venció o no has entrado. Ingresa con tu ID y contraseña.",
  general: "Algo salió mal. Intenta de nuevo.",
};

// 1 · Postulación. Llega desde el link de la vacante (enlace_token). Aquí se envían los datos
// y la hoja de vida; después solo se entra a responder las preguntas.
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

  return (
    <>
      <div className="top">
        <EncabezadoEmpresa nombre={vacante.empresa_nombre} logoUrl={vacante.empresa_logo_url} />
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

        <form action={postularse} className="tarjeta tarjeta-compacta">
          <input type="hidden" name="token" value={token} />

          <div className="campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              name="nombre"
              className="inp"
              placeholder="Tu nombre"
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
            />
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
              maxLength={254}
              autoComplete="email"
            />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              className="inp"
              placeholder="300 000 0000"
              required
              minLength={7}
              maxLength={20}
              autoComplete="tel"
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
              pattern="[A-Za-z0-9.\- ]{6,20}"
              title="De 6 a 20 letras o números"
              aria-describedby="documento-ayuda"
            />
            <span id="documento-ayuda" className="texto-gris" style={{ fontSize: 12 }}>
              Con este número vuelves a entrar: es tu ID y tu contraseña.
            </span>
          </div>
          <div className="campo">
            <label htmlFor="cv">Hoja de vida (PDF, máximo 4 MB)</label>
            <input id="cv" name="cv" type="file" accept="application/pdf" className="inp" required />
          </div>

          <div className="flex" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <input id="acepto" name="acepto" type="checkbox" required style={{ width: 20, height: 20, marginTop: 2 }} />
            <label htmlFor="acepto" style={{ fontSize: 12, lineHeight: 1.45, color: "var(--tx2)" }}>
              Acepto el tratamiento de mis datos y la grabación de mis respuestas (Ley 1581 de 2012).
            </label>
          </div>

          <button type="submit" className="btn">
            Postularme
          </button>
        </form>

        <p className="texto-gris centrado">
          ¿Ya te postulaste? <Link href={`/postular/${token}/ingreso`}>Ingresa con tu ID</Link>
        </p>
      </div>
    </>
  );
}
