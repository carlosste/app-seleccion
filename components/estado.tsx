import type { Decision } from "@/lib/datos-prueba";

const etiquetas: Record<Decision, { texto: string; clase: string }> = {
  pasa: { texto: "Pasa", clase: "est pasa" },
  pendiente: { texto: "Pendiente", clase: "est pend" },
  no: { texto: "No pasa", clase: "est no" },
};

export function Estado({ decision }: { decision: Decision }) {
  const etiqueta = etiquetas[decision];
  return <span className={etiqueta.clase}>{etiqueta.texto}</span>;
}
