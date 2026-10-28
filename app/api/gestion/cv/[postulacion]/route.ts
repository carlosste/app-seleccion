import { NextResponse } from "next/server";
import { obtenerSesionEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esUuid, formatoNumero } from "@/lib/gestion/datos";

// Entrega el CV original de una postulación, en cualquier etapa (decisión de Carlos,
// 2026-10-28: gestión humana necesita la hoja de vida a la mano). Reglas: la sesión debe ser
// de empresa y la postulación de una vacante de esa empresa (RLS + comprobación explícita).
// ?descargar=1 lo baja como archivo; si no, se muestra en la página. El nombre del archivo
// es el número anónimo, no el de la persona. Cada vista y descarga queda en registro_actividad.
export async function GET(req: Request, ctx: RouteContext<"/api/gestion/cv/[postulacion]">) {
  const sinCache = { "Cache-Control": "private, no-store" };
  const sesion = await obtenerSesionEmpresa();
  if (!sesion) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: sinCache });

  const { postulacion } = await ctx.params;
  if (!esUuid(postulacion)) return NextResponse.json({ error: "No encontrado" }, { status: 404, headers: sinCache });

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("postulaciones")
    .select("id, numero_anonimo, cv_path, vacante:vacantes(empresa_id)")
    .eq("id", postulacion)
    .maybeSingle<{ id: string; numero_anonimo: number; cv_path: string | null; vacante: { empresa_id: string } | null }>();

  // Mismo 404 si no existe o es de otra empresa: no se revela qué IDs existen.
  if (!data || data.vacante?.empresa_id !== sesion.empresa.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404, headers: sinCache });
  }
  if (!data.cv_path) return NextResponse.json({ error: "Esta postulación no tiene CV" }, { status: 404, headers: sinCache });

  // El bucket es privado: lo baja el servidor y lo entrega desde el mismo dominio (así se
  // puede mostrar dentro de la página sin exponer una URL del almacenamiento).
  const admin = crearClienteAdmin();
  const { data: archivo, error } = await admin.storage.from("cvs").download(data.cv_path);
  if (error || !archivo) {
    console.error("[cv] download", error);
    return NextResponse.json({ error: "No se pudo abrir el CV" }, { status: 500, headers: sinCache });
  }

  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  await admin.from("registro_actividad").insert({
    empresa_id: sesion.empresa.id,
    usuario_id: sesion.usuarioId,
    accion: descargar ? "descargar_cv" : "ver_cv",
    tabla: "postulaciones",
    registro_id: data.id,
  });

  const nombre = `candidato-${formatoNumero(data.numero_anonimo)}.pdf`;
  return new NextResponse(archivo, {
    headers: {
      ...sinCache,
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
