import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_POSTULANTE, esZonaPostulante } from "@/lib/supabase/config";
import { actualizarSesion, redirigirConCookies } from "@/lib/supabase/proxy";

// Primera barrera (rápida, antes de renderizar). No es la única: cada layout de
// /gestion vuelve a verificar en el servidor y RLS protege los datos en la base.
// La empresa y el postulante tienen cookies de sesión separadas: cada zona solo mira la suya,
// así en el mismo navegador una no manda a la otra ni la cierra.
export async function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;

  // Zona del postulante: solo se refresca su sesión. Nunca redirige al panel de empresa.
  if (esZonaPostulante(ruta)) {
    const { respuesta } = await actualizarSesion(request, COOKIE_POSTULANTE);
    return respuesta();
  }

  const { respuesta, autenticado, tipo } = await actualizarSesion(request);
  const ir = (destino: string, params?: Record<string, string>) => {
    const url = new URL(destino, request.url);
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return redirigirConCookies(respuesta(), url);
  };

  const esPanel = ruta === "/gestion" || ruta.startsWith("/gestion/");
  const esApiPanel = ruta.startsWith("/api/gestion/");

  // 1. Panel de empresa: requiere sesión de tipo empresa.
  if (esPanel || esApiPanel) {
    if (!autenticado || tipo !== "empresa") {
      if (esApiPanel) {
        return NextResponse.json({ error: "No autorizado" }, { status: autenticado ? 403 : 401 });
      }
      const params: Record<string, string> = { siguiente: ruta };
      if (autenticado) params.error = "cuenta"; // sesión válida, pero no es de empresa
      return ir("/empresa/ingreso", params);
    }
  }

  // 2. Empresa ya autenticada: no tiene sentido mostrarle ingreso o registro.
  if ((ruta === "/empresa/ingreso" || ruta === "/empresa/registro") && tipo === "empresa") {
    return ir("/gestion");
  }

  return respuesta();
}

export const config = {
  matcher: ["/gestion/:path*", "/api/gestion/:path*", "/empresa/:path*", "/postular/:path*"],
};
