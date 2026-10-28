import Link from "next/link";
import { EncabezadoEmpresa } from "@/components/encabezado-empresa";
import { vacantePorToken } from "@/lib/vacante-publica";
import { ingresar } from "../../acciones";

const MENSAJES: Record<string, string> = {
  credenciales: "El ID o la contraseña no son correctos. Los dos son tu número de documento.",
  bloqueo: "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.",
  general: "Algo salió mal. Intenta de nuevo.",
};

// 2 · Ingreso de quien ya se postuló: ID y contraseña (por ahora, los dos son el número de
// documento). No sube nada: entra directo a sus preguntas.
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

  return (
    <div className="contenido" style={{ padding: "48px 24px", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <EncabezadoEmpresa nombre={vacante.empresa_nombre} logoUrl={vacante.empresa_logo_url} grande />
      </div>

      <div className="centrado">
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Ingresa a tu proceso</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--gris)" }}>
          Vacante: <b>{vacante.cargo}</b>. Tu ID y tu contraseña son tu número de documento.
        </p>
      </div>

      {error && MENSAJES[error] && (
        <div className="nota nota-na" role="alert">
          {MENSAJES[error]}
        </div>
      )}

      <form action={ingresar} className="tarjeta">
        <input type="hidden" name="token" value={token} />

        <div className="campo">
          <label htmlFor="id">ID</label>
          <input
            id="id"
            name="id"
            className="inp"
            placeholder="Tu número de documento"
            required
            maxLength={20}
            inputMode="numeric"
            autoComplete="username"
            style={{ height: 48 }}
          />
        </div>
        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            className="inp"
            placeholder="Tu número de documento"
            required
            maxLength={20}
            autoComplete="current-password"
            style={{ height: 48 }}
          />
        </div>

        <button type="submit" className="btn">
          Ingresar
        </button>
        <Link href={`/postular/${token}`} className="centrado" style={{ fontSize: 13 }}>
          ¿Aún no te postulas? Llena el formulario
        </Link>
      </form>
    </div>
  );
}
