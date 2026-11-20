// Lee una transcripción de entrevista pegada o subida (Teams, Meet, Zoom) y la separa en turnos
// de quién habla. Sin dependencias ni acceso al servidor: la usa el navegador (para mostrar los
// hablantes y elegir al candidato) y el servidor (para armar lo que va a la IA).
//
// Formatos que entiende:
// - WebVTT de Teams: "00:00:01.000 --> 00:00:04.000" y "<v Ana Pérez>texto</v>".
// - Copiado del panel de Teams: "Ana Pérez   0:03" (o "00:01:02") en una línea y el texto debajo.
// - Genérico: "Ana Pérez: texto".
// Lo que no se puede atribuir a nadie queda como "Sin identificar".

export type Turno = { hablante: string; texto: string };

export const SIN_IDENTIFICAR = "Sin identificar";
export const LARGO_MAXIMO_TRANSCRIPCION = 200_000;

const MARCA_TIEMPO = /^\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?/;
const VOZ_VTT = /<v\s+([^>]{1,80})>([\s\S]*?)(<\/v>|$)/gi;
// "Ana Pérez   0:03" o "Ana Pérez 1:02:33" (Teams), opcionalmente con "|" o "-" en medio.
const ENCABEZADO_TEAMS = /^(.{2,60}?)\s*[|\-–]?\s+(\d{1,2}:\d{2}(:\d{2})?)\s*$/;
// "Ana Pérez: texto" — el nombre de 1 a 5 palabras, sin dígitos.
const NOMBRE_DOS_PUNTOS = /^([\p{L}][\p{L}.'´ -]{1,58}?)\s*:\s+(.+)$/u;

function limpiarNombre(n: string) {
  return n.replace(/\s+/g, " ").trim().slice(0, 80);
}

function pareceNombre(n: string) {
  const palabras = n.trim().split(/\s+/);
  return palabras.length >= 1 && palabras.length <= 5 && !/\d/.test(n);
}

// Palabras que suelen abrir una línea con dos puntos sin ser una persona.
const NO_SON_NOMBRES = new Set(
  ["nota", "ejemplo", "importante", "pregunta", "respuesta", "resumen", "conclusión", "tema", "objetivo", "fecha", "hora", "asunto", "observación", "aclaración", "paso", "primero", "segundo", "luego", "después", "entonces", "bueno", "sí", "no", "ok"],
);
const CONECTORES = new Set(["de", "del", "la", "las", "los", "y", "da", "van", "von"]);

// "Pedro" o "Ana María de la Torre": cada palabra con mayúscula inicial (salvo conectores) y
// que no sea una palabra común. Sirve para aceptar a quien habla una sola vez.
function esNombrePropio(n: string) {
  const palabras = limpiarNombre(n).split(" ");
  if (palabras.length === 1 && NO_SON_NOMBRES.has(palabras[0].toLowerCase())) return false;
  return palabras.every((p, i) => (i > 0 && CONECTORES.has(p)) || /^\p{Lu}/u.test(p));
}

export function leerTranscripcion(bruto: string): Turno[] {
  const texto = bruto.replace(/\r\n?/g, "\n").replace(/^﻿/, "").slice(0, LARGO_MAXIMO_TRANSCRIPCION);
  const turnos: Turno[] = [];
  const agregar = (hablante: string, t: string) => {
    const limpio = t.replace(/<[^>]{1,40}>/g, "").replace(/\s+/g, " ").trim();
    if (!limpio) return;
    const ultimo = turnos[turnos.length - 1];
    if (ultimo && ultimo.hablante === hablante) ultimo.texto += ` ${limpio}`;
    else turnos.push({ hablante, texto: limpio });
  };

  // "Nombre: texto" cuenta como hablante si ese nombre abre al menos dos líneas, o si abre una
  // sola pero parece nombre propio y el texto ya viene en este formato (otra persona con dos o
  // más líneas): así entra el entrevistador que pregunta una vez, y una frase como
  // "Por ejemplo: …" dentro de una respuesta no se toma como otra persona.
  const vecesDosPuntos = new Map<string, number>();
  for (const linea of texto.split("\n")) {
    const m = linea.trim().match(NOMBRE_DOS_PUNTOS);
    if (m && pareceNombre(m[1])) vecesDosPuntos.set(limpiarNombre(m[1]), (vecesDosPuntos.get(limpiarNombre(m[1])) ?? 0) + 1);
  }
  const formatoDosPuntos = [...vecesDosPuntos.values()].some((v) => v >= 2);
  const esHablante = (nombre: string) => {
    const veces = vecesDosPuntos.get(limpiarNombre(nombre)) ?? 0;
    return veces >= 2 || (veces === 1 && formatoDosPuntos && esNombrePropio(nombre));
  };

  let actual = SIN_IDENTIFICAR;
  for (const linea of texto.split("\n")) {
    const l = linea.trim();
    if (!l || l === "WEBVTT" || /^NOTE\b/.test(l) || MARCA_TIEMPO.test(l)) continue;
    // Número de bloque del VTT ("12") o un id tipo "1a2b3c/14-0".
    if (/^\d+$/.test(l) || /^[0-9a-f-]{8,}\/\d+-\d+$/i.test(l)) continue;

    if (l.includes("<v ")) {
      let hubo = false;
      for (const m of l.matchAll(VOZ_VTT)) {
        hubo = true;
        actual = limpiarNombre(m[1]);
        agregar(actual, m[2]);
      }
      if (hubo) continue;
    }

    const teams = l.match(ENCABEZADO_TEAMS);
    if (teams && pareceNombre(teams[1])) {
      actual = limpiarNombre(teams[1]);
      continue;
    }

    const conDosPuntos = l.match(NOMBRE_DOS_PUNTOS);
    if (conDosPuntos && pareceNombre(conDosPuntos[1]) && esHablante(conDosPuntos[1])) {
      actual = limpiarNombre(conDosPuntos[1]);
      agregar(actual, conDosPuntos[2]);
      continue;
    }

    agregar(actual, l);
  }
  return turnos;
}

// Hablantes con cuántas palabras dijo cada uno, de más a menos: el candidato suele hablar más.
export function hablantes(turnos: Turno[]): { nombre: string; palabras: number; turnos: number }[] {
  const mapa = new Map<string, { palabras: number; turnos: number }>();
  for (const t of turnos) {
    const h = mapa.get(t.hablante) ?? { palabras: 0, turnos: 0 };
    h.palabras += t.texto.split(/\s+/).length;
    h.turnos += 1;
    mapa.set(t.hablante, h);
  }
  return [...mapa.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.palabras - a.palabras);
}

// Cambia los nombres por papeles ("Candidato", "Entrevistador 1"…) y borra de los textos las
// palabras de esos nombres, para que a la IA no le lleguen nombres propios de la entrevista.
// Si el candidato es SIN_IDENTIFICAR (transcripción sin hablantes), todo queda como "Conversación".
export function anonimizar(turnos: Turno[], candidato: string): { quien: string; texto: string; esCandidato: boolean }[] {
  const otros = [...new Set(turnos.map((t) => t.hablante).filter((h) => h !== candidato))];
  const papel = (h: string) =>
    h === candidato
      ? candidato === SIN_IDENTIFICAR
        ? "Conversación"
        : "Candidato"
      : otros.length > 1
        ? `Entrevistador ${otros.indexOf(h) + 1}`
        : "Entrevistador";

  const palabrasNombres = [...new Set(turnos.map((t) => t.hablante))]
    .filter((h) => h !== SIN_IDENTIFICAR)
    .flatMap((h) => h.split(/\s+/))
    .map((p) => p.replace(/[^\p{L}'´-]/gu, ""))
    .filter((p) => p.length >= 3);
  const patron = palabrasNombres.length
    ? new RegExp(`(?<![\\p{L}])(${palabrasNombres.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`, "giu")
    : null;

  return turnos.map((t) => ({
    quien: papel(t.hablante),
    texto: patron ? t.texto.replace(patron, "[nombre]") : t.texto,
    esCandidato: t.hablante === candidato,
  }));
}
