import type { Decision } from "@/lib/datos-prueba";

// Chip de la decisión de gestión humana, con el mismo estilo de chips del inicio.
const etiquetas: Record<Decision, { texto: string; clase: string }> = {
  pasa: { texto: "Pasa", clase: "chip-estado chip-estado--ok" },
  pendiente: { texto: "Pendiente", clase: "chip-estado" },
  no: { texto: "No pasa", clase: "chip-estado chip-estado--no" },
};

export function Estado({ decision }: { decision: Decision }) {
  const etiqueta = etiquetas[decision];
  return <span className={etiqueta.clase}>{etiqueta.texto}</span>;
}
