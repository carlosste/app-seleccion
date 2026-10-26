// Variables públicas de Supabase (se pueden leer en servidor, proxy y navegador).
export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }
  return { url, clave };
}

// URL base para los enlaces que salen por correo. No se toma del header Host
// para evitar que alguien cambie el dominio de los enlaces (host header injection).
export function urlSitio() {
  const url = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
  if (!url) throw new Error("Falta APP_URL (por ejemplo https://tu-app.vercel.app)");
  return url.replace(/\/$/, "");
}

// Las cookies de sesión solo las usa el servidor (no hay cliente de Supabase en el
// navegador), así que se marcan httpOnly: un script inyectado no puede leer el token.
export function endurecerCookie<T extends object>(opciones: T): T {
  return { ...opciones, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" };
}
