import { IA_PLAN_PAGO } from "@/lib/legal/tratamiento-datos";

// Aviso visible mientras la IA use el plan gratuito de Gemini (ver IA_PLAN_PAGO en
// lib/legal/tratamiento-datos.ts). Desaparece solo al pasar a modelos de pago.
export function AvisoModoPruebas({ para }: { para: "postulante" | "empresa" }) {
  if (IA_PLAN_PAGO) return null;
  return (
    <div className="nota nota-na" role="note" style={{ fontSize: 13, lineHeight: 1.5 }}>
      <span>
        <b>Modo de pruebas: usa solo datos ficticios.</b>{" "}
        {para === "postulante"
          ? "La IA de esta versión corre en un plan gratuito cuyo proveedor puede usar lo enviado para mejorar sus productos. No subas una hoja de vida ni datos reales."
          : "La IA corre con modelos gratuitos de Gemini, cuyo proveedor puede usar lo enviado para mejorar sus productos. No cargues hojas de vida ni datos de personas reales hasta pasar a modelos de pago."}
      </span>
    </div>
  );
}
