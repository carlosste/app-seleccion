import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { configSupabase, endurecerCookie } from "./config";

export type TipoCuenta = "empresa" | "postulante" | null;

// Refresca la sesión (si el JWT venció, usa el refresh token y reescribe las cookies)
// y devuelve el tipo de cuenta leído del JWT verificado. nombreCookie elige cuál sesión:
// la de la empresa (por defecto) o la del postulante (COOKIE_POSTULANTE).
export async function actualizarSesion(request: NextRequest, nombreCookie?: string) {
  const { url, clave } = configSupabase();
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(url, clave, {
    ...(nombreCookie ? { cookieOptions: { name: nombreCookie } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista, encabezados) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, endurecerCookie(options)));
        Object.entries(encabezados).forEach(([k, v]) => respuesta.headers.set(k, v));
      },
    },
  });

  // getClaims valida la firma y la expiración del JWT (no confía en la cookie a ciegas).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const tipo = (claims?.app_metadata as { tipo?: string } | undefined)?.tipo;

  return {
    respuesta: () => respuesta,
    autenticado: Boolean(claims?.sub),
    tipo: (tipo === "empresa" || tipo === "postulante" ? tipo : null) as TipoCuenta,
  };
}

// Redirección que conserva las cookies refrescadas (si no, se pierde la sesión nueva).
export function redirigirConCookies(base: NextResponse, destino: URL) {
  const r = NextResponse.redirect(destino);
  base.cookies.getAll().forEach((c) => r.cookies.set(c));
  base.headers.forEach((v, k) => {
    if (k.toLowerCase() === "cache-control") r.headers.set(k, v);
  });
  return r;
}
