import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";
import { vacantePorToken } from "@/lib/vacante-publica";
import { verificarCodigo } from "../../acciones";

const MENSAJES: Record<string, string> = {
  codigo: "El código no es correcto o ya venció. Revisa el correo o pide uno nuevo.",
  bloqueo: "Escribiste mal el código demasiadas veces. Espera 15 minutos y pide uno nuevo.",
  clave: "La contraseña debe tener al menos 8 caracteres (solo la primera vez).",
  "clave-debil": "Esa contraseña es muy débil o aparece en filtraciones conocidas. Elige otra.",
  cv: "Sube tu hoja de vida en PDF (un PDF real, no otro archivo renombrado), de máximo 4 MB.",
  empresa: "Ese correo es de una cuenta de empresa. Para postularte usa tu correo personal.",
  limite: "Esta empresa ya no recibe más postulaciones por ahora.",
  general: "Algo salió mal. Intenta de nuevo.",
};

// 2 · Ingreso con código. La primera vez crea la contraseña y sube la hoja de vida.
export default async function Ingreso({
  params,
  searchParams,
}: {
  params: Promise<{ vacante: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { vacante: token } = await params;
  const { error } = await searchParams;
  const vacante = await vacantePorToken(token);

  const correo = (await cookies()).get("postulacion_correo")?.value;
  if (!correo) redirect(`/postular/${token}?error=sesion`);

  return (
    <div className="contenido" style={{ padding: "48px 24px", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <EncabezadoEmpresa nombre={vacante.empresa_nombre} logoUrl={vacante.empresa_logo_url} grande />
      </div>

      <div className="centrado">
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Ingresa a tu proceso</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--gris)" }}>
          Usa el código que te enviamos a <b>{correo}</b> para postularte a <b>{vacante.cargo}</b>. La primera
          vez, crea tu contraseña. Sube tu hoja de vida si es tu primera postulación a esta vacante.
        </p>
      </div>

      {error && MENSAJES[error] && (
        <div className="nota nota-na" role="alert">
          {MENSAJES[error]}
        </div>
      )}

      <form action={verificarCodigo} className="tarjeta" encType="multipart/form-data">
        <input type="hidden" name="token" value={token} />

        <div className="campo">
          <label htmlFor="codigo">Código de acceso</label>
          <input
            id="codigo"
            name="codigo"
            className="inp"
            placeholder="123456"
            required
            maxLength={10}
            inputMode="numeric"
            autoComplete="one-time-code"
            style={{ height: 48, fontSize: 18, letterSpacing: "0.12em" }}
          />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña (solo la primera vez)</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            className="inp"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            style={{ height: 48 }}
          />
        </div>
        <div className="campo">
          <label htmlFor="cv">Hoja de vida (PDF, máximo 4 MB)</label>
          <input id="cv" name="cv" type="file" accept="application/pdf" className="inp" />
        </div>

        <button type="submit" className="btn">
          Ingresar
        </button>
        <a href={`/postular/${token}`} className="centrado" style={{ fontSize: 13 }}>
          Cambiar mis datos o pedir otro código
        </a>
      </form>
    </div>
  );
}
