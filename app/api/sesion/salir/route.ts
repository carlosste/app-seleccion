import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// "Cerrar sesión" del menú de la cuenta en la página de inicio (formulario POST desde HTML
// estático, donde no hay Server Actions). Solo acepta envíos desde este mismo sitio.
export async function POST(request: NextRequest) {
  const origen = request.headers.get("origin");
  if (origen && origen !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  // 303: después del POST el navegador vuelve al inicio con un GET.
  return NextResponse.redirect(new URL("/", request.url), 303);
}
