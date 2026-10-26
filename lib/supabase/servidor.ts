import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { configSupabase, endurecerCookie } from "./config";

// Cliente con la sesión del usuario (cookies httpOnly). Todo lo que lee pasa por RLS.
// Crear uno nuevo por petición.
export async function crearClienteServidor() {
  const { url, clave } = configSupabase();
  const almacen = await cookies();

  return createServerClient(url, clave, {
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
