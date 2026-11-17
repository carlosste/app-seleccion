import type { ReactNode } from "react";

export type Cita = { texto: string; criterio: string };

// Igual que normalizar() en lib/ia/proteccion.ts (minúsculas, sin tildes, espacios colapsados),
// pero guardando para cada carácter normalizado su posición en el texto original, así la marca
// cae sobre las palabras tal como las escribió el postulante.
function normalizarConMapa(texto: string) {
  let norm = "";
  const mapa: number[] = [];
  let espacioPrevio = false;
  for (let i = 0; i < texto.length; i++) {
    const base = texto[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (/\s/.test(base)) {
      if (espacioPrevio || norm.length === 0) continue;
      norm += " ";
      mapa.push(i);
      espacioPrevio = true;
      continue;
    }
    for (const c of base) {
      norm += c;
      mapa.push(i);
    }
    espacioPrevio = false;
  }
  return { norm, mapa };
}

// La cita sin comillas ni puntos suspensivos alrededor, que la IA a veces agrega.
const limpiarCita = (cita: string) =>
  cita
    .trim()
    .replace(/^[«"“'‘\s]+|[»"”'’\s]+$/g, "")
    .replace(/[.…]+$/, "")
    .trim();

// Devuelve el texto de la respuesta con cada cita de la IA marcada (<mark>). Solo presentación:
// una cita que no aparece tal cual no se marca (la pantalla ya avisa "evidencia no verificada").
// Las citas de menos de 12 caracteres no se marcan: no prueban nada y ensuciarían el texto.
export function marcarEvidencia(texto: string, citas: Cita[]): ReactNode {
  if (!texto || citas.length === 0) return texto;
  const { norm, mapa } = normalizarConMapa(texto);
  const tramos: { ini: number; fin: number; criterio: string }[] = [];

  for (const c of citas) {
    const cita = normalizarConMapa(limpiarCita(c.texto)).norm.trim();
    if (cita.length < 12) continue;
    const pos = norm.indexOf(cita);
    if (pos === -1) continue;
    const ini = mapa[pos];
    const fin = mapa[pos + cita.length - 1] + 1;
    if (tramos.some((t) => ini < t.fin && fin > t.ini)) continue; // sin marcas encimadas
    tramos.push({ ini, fin, criterio: c.criterio });
  }
  if (tramos.length === 0) return texto;

  tramos.sort((a, b) => a.ini - b.ini);
  const partes: ReactNode[] = [];
  let cursor = 0;
  tramos.forEach((t, i) => {
    if (t.ini > cursor) partes.push(texto.slice(cursor, t.ini));
    partes.push(
      <mark key={i} className="evidencia-marca" title={`Evidencia de «${t.criterio}»`}>
        {texto.slice(t.ini, t.fin)}
      </mark>,
    );
    cursor = t.fin;
  });
  if (cursor < texto.length) partes.push(texto.slice(cursor));
  return partes;
}
