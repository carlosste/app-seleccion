import "server-only";
import { createClient } from "@supabase/supabase-js";
import { configSupabase } from "./config";

// Cliente con la service role: se salta RLS. Úsalo solo para lo que el usuario
// no puede hacer por sí mismo (crear la cuenta, contar intentos, firmar URLs de CV),
// y siempre después de comprobar permisos.
export function crearClienteAdmin() {
  const { url } = configSupabase();
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!claveServicio) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");

  return createClient(url, claveServicio, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
