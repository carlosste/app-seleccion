import Link from "next/link";
import { vacantePorToken } from "@/lib/vacante-publica";

// 4 · Cuestionario terminado. No muestra las etapas internas.
export default async function Terminado({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: token } = await params;
  await vacantePorToken(token);

  return (
    <div className="contenido" style={{ padding: "64px 24px 32px", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--verde-cl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1F7A4D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 style={{ fontSize: 26 }}>Cuestionario terminado</h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--gris)" }}>
          Gracias por responder. Tus respuestas quedaron enviadas a la empresa.
        </p>
      </div>

      <div className="tarjeta" style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <div>
          <b style={{ fontSize: 16 }}>Espera el contacto de la empresa</b>
          <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: "var(--tx2)" }}>
            Cuando revisen tus respuestas, vuelve a entrar para ver si continúas en el proceso.
          </p>
        </div>
      </div>

      <div className="tarjeta" style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <div>
          <b style={{ fontSize: 16 }}>Si continúas, vuelve a ingresar</b>
          <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, color: "var(--tx2)" }}>
            Entra desde el enlace de esta vacante con tu ID y tu contraseña (tu número de documento) para responder
            las siguientes preguntas o agendar tu entrevista.
          </p>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <Link href={`/postular/${token}`} className="btn btn-sec">
        Salir
      </Link>
    </div>
  );
}
