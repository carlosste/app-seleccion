import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { COOKIE_POSTULANTE, configSupabase, endurecerCookie } from "./config";

// Cliente con la sesión del usuario (cookies httpOnly). Todo lo que lee pasa por RLS.
// Crear uno nuevo por petición.
async function crearCliente(nombreCookie?: string) {
  const { url, clave } = configSupabase();
  const almacen = await cookies();

  return createServerClient(url, clave, {
    ...(nombreCookie ? { cookieOptions: { name: nombreCookie } } : {}),
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, endurecerCookie(options)));
        } catch {
          // Desde un Server Component no se pueden escribir cookies. No pasa nada:
          // proxy.ts ya refrescó la sesión antes de llegar aquí.
        }
      },
    },
  });
}

// Sesión de la empresa (panel de gestión).
export function crearClienteServidor() {
  return crearCliente();
}

// Sesión del postulante: cookie aparte (ver COOKIE_POSTULANTE).
export function crearClientePostulante() {
  return crearCliente(COOKIE_POSTULANTE);
}
