import type { Metadata } from "next";
import Link from "next/link";
import { AvisoModoPruebas } from "@/components/aviso-modo-pruebas";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";
import { FormularioPostulacion } from "@/components/postular/formulario-postulacion";
import { CASILLA_DATOS, CASILLA_GRABACION } from "@/lib/legal/tratamiento-datos";
import { tituloVacante, vacantePorToken } from "@/lib/vacante-publica";

// Avisos que llegan por la URL desde otras pantallas (los errores del formulario llegan sin recargar).
const AVISOS: Record<string, string> = {
  "sin-postulacion": "Aún no te has postulado a esta vacante. Llena el formulario y sube tu hoja de vida.",
  sesion: "Tu sesión venció o no has entrado. Ingresa con tu ID y contraseña.",
};

// Con más texto que esto, la descripción se pliega para que el formulario no quede lejos en el celular.
const DESCRIPCION_CORTA = 280;

export async function generateMetadata({ params }: { params: Promise<{ vacante: string }> }): Promise<Metadata> {
  return { title: await tituloVacante((await params).vacante, "Postúlate") };
}

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
  const descripcion = vacante.descripcion?.trim() ?? "";

  return (
    <>
      <div className="top">
        <EncabezadoEmpresa nombre={vacante.empresa_nombre} logoUrl={vacante.empresa_logo_url} />
      </div>
      <div className="contenido">
        <div className="campo" style={{ gap: 6 }}>
          <span className="etq">Vacante</span>
          <h1 className="titulo-vacante">{vacante.cargo}</h1>
          {descripcion &&
            (descripcion.length > DESCRIPCION_CORTA ? (
              <details className="descripcion-vacante">
                <summary>
                  <span className="texto-gris">{descripcion.slice(0, 160).trimEnd()}…</span>
                  <span className="descripcion-vacante__mas">Leer la descripción completa</span>
                </summary>
                <p className="texto-gris">{descripcion}</p>
              </details>
            ) : (
              <p className="texto-gris">{descripcion}</p>
            ))}
        </div>

        <ol className="como-funciona" aria-label="Cómo es el proceso">
          <li>
            <b>Llenas este formulario</b>
            <span>Tus datos y tu hoja de vida en PDF. Toma unos 5 minutos.</span>
          </li>
          <li>
            <b>Respondes unas preguntas</b>
            <span>Por escrito y, si la vacante lo pide, en voz alta. Si prefieres, también esas las puedes escribir.</span>
          </li>
          <li>
            <b>La empresa te contacta</b>
            <span>Una persona revisa tus respuestas. Si pasas a la entrevista, te escriben con la fecha y la hora.</span>
          </li>
        </ol>

        <AvisoModoPruebas para="postulante" />

        {error && AVISOS[error] && (
          <div className="nota nota-na" role="alert">
            {AVISOS[error]}
          </div>
        )}

        <FormularioPostulacion
          token={token}
          empresa={vacante.empresa_nombre}
          casillaDatos={CASILLA_DATOS}
          casillaGrabacion={CASILLA_GRABACION}
        />

        <div className="ya-postulado">
          <span>¿Ya te postulaste?</span>
          <Link href={`/postular/${token}/ingreso`} className="btn btn-sec">
            Ingresa con tu documento
          </Link>
        </div>
      </div>
    </>
  );
}
