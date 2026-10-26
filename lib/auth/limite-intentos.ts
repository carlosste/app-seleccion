import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Reglas (CLAUDE.md, "Límites de ingreso"): 5 fallos en 15 min bloquean 15 min.
// Además, una IP que falla muchas veces con correos distintos también se bloquea
// (frena el "credential stuffing").
export const REGLAS = {
  ingresoCorreo: { maximo: 5, ventana: 15 * 60, bloqueo: 15 * 60 },
  ingresoIp: { maximo: 20, ventana: 15 * 60, bloqueo: 15 * 60 },
  registroIp: { maximo: 5, ventana: 60 * 60, bloqueo: 60 * 60 },
  reenvioCorreo: { maximo: 3, ventana: 60 * 60, bloqueo: 60 * 60 },
} as const;

type Regla = (typeof REGLAS)[keyof typeof REGLAS];

// Se guarda solo el hash: la tabla no contiene correos ni IPs legibles.
export function clave(prefijo: string, valor: string) {
  return createHash("sha256").update(`${prefijo}:${valor}`).digest("hex");
}

export async function obtenerIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
}

// Si la base falla, se deja pasar (y se registra el error) para no bloquear a todos.
// Supabase Auth tiene además su propio límite por IP en el endpoint de ingreso.
export async function consultarBloqueo(claves: string[]): Promise<Date | null> {
  const { data, error } = await crearClienteAdmin().rpc("consultar_bloqueo", { p_claves: claves });
  if (error) {
    console.error("[limite-intentos] consultar_bloqueo", error.message);
    return null;
  }
  return data ? new Date(data as string) : null;
}

export async function registrarIntento(claveHash: string, regla: Regla): Promise<Date | null> {
  const { data, error } = await crearClienteAdmin().rpc("registrar_intento", {
    p_clave: claveHash,
    p_maximo: regla.maximo,
    p_ventana_segundos: regla.ventana,
    p_bloqueo_segundos: regla.bloqueo,
  });
  if (error) {
    console.error("[limite-intentos] registrar_intento", error.message);
    return null;
  }
  return data ? new Date(data as string) : null;
}

export async function limpiarIntentos(claveHash: string) {
  const { error } = await crearClienteAdmin().rpc("limpiar_intentos", { p_clave: claveHash });
  if (error) console.error("[limite-intentos] limpiar_intentos", error.message);
}

export function minutosRestantes(hasta: Date) {
  return Math.max(1, Math.ceil((hasta.getTime() - Date.now()) / 60000));
}
