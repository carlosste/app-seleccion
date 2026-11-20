import "server-only";
import { obtenerPostulante } from "./datos";
import type { PerfilComparar } from "./calificacion-ia";

// Datos de 2 a 6 perfiles de la misma vacante para compararlos (2026-11-19). Cada perfil sale
// de obtenerPostulante, que exige la sesión de la empresa y filtra por ella (RLS + empresa_id):
// un número de otra vacante o empresa simplemente no aparece. Sin nombres ni datos de contacto.

export const MIN_COMPARAR = 2;
export const MAX_COMPARAR = 6;

export type PerfilVista = PerfilComparar & { decision: string };

const ESTADO: Record<string, string> = {
  en_proceso: "En proceso",
  descartada: "Descartado",
  seleccionada: "Seleccionado",
};

// "014,27,#003" → ["014", "027", "003"], sin repetidos y como máximo 6.
export function leerNumeros(texto: string | undefined): string[] {
  const vistos = new Set<string>();
  for (const parte of String(texto ?? "").split(",")) {
    const d = parte.replace(/\D/g, "");
    if (d && d.length <= 6) vistos.add(String(Number(d)).padStart(3, "0"));
    if (vistos.size >= MAX_COMPARAR) break;
  }
  return [...vistos];
}

export async function perfilesParaComparar(vacanteId: string, numeros: string[]): Promise<PerfilVista[]> {
  const datos = await Promise.all(numeros.slice(0, MAX_COMPARAR).map((n) => obtenerPostulante(vacanteId, n)));
  return datos
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => {
      const etapas = d.rubrica && !d.rubrica.anterior ? d.rubrica.etapas : [];
      return {
        numero: d.numero,
        etapa: d.estado === "en_proceso" ? (d.etapaActual ?? "Sin etapa") : ESTADO[d.estado],
        estado: ESTADO[d.estado] ?? d.estado,
        decision: d.estado,
        ajusteTotal: d.ajusteTotal,
        etapas: etapas.map((e) => ({ nombre: e.nombre, ajuste: e.ajuste, fortalezas: e.fortalezas, profundizar: e.profundizar })),
        hojaDeVida: d.cv?.hojaDeVida ?? [],
        requisitos: (d.cv?.requisitos ?? []).map((q) => ({ requisito: q.requisito, estado: q.estado })),
        entrevista: d.analisisEntrevista
          ? {
              nombre: d.analisisEntrevista.nombre,
              ajuste: d.analisisEntrevista.ajuste,
              resumen: d.analisisEntrevista.resumen,
              fortalezas: d.analisisEntrevista.fortalezas,
              debilidades: d.analisisEntrevista.debilidades,
            }
          : null,
      };
    });
}
