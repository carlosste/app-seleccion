// Variables públicas de Supabase (se pueden leer en servidor, proxy y navegador).
export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }
  return { url, clave };
}

// El postulante tiene su propia cookie de sesión, separada de la de la empresa (que usa el
// nombre por defecto de Supabase). Así, en el mismo navegador, entrar como postulante no
// cierra el panel de la empresa ni al revés, y ninguna zona ve la sesión de la otra.
export const COOKIE_POSTULANTE = "sb-postulante-auth-token";

export const esZonaPostulante = (ruta: string) => ruta === "/postular" || ruta.startsWith("/postular/");

// Las cookies de sesión solo las usa el servidor (no hay cliente de Supabase en el
// navegador), así que se marcan httpOnly: un script inyectado no puede leer el token.
export function endurecerCookie<T extends object>(opciones: T): T {
  return { ...opciones, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" };
}
