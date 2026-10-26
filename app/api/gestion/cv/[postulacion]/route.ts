import { NextResponse } from "next/server";
import { obtenerSesionEmpresa } from "@/lib/auth/sesion-empresa";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esUuid } from "@/lib/gestion/datos";

// Entrega el CV original de una postulación mediante una URL firmada de 60 s.
// Reglas: la sesión debe ser de empresa, la postulación debe ser de una vacante
// de esa empresa (RLS + comprobación explícita) y el nombre ya debe estar revelado
// (revisión a ciegas, CLAUDE.md). Cada descarga queda en registro_actividad.
export async function GET(_req: Request, ctx: RouteContext<"/api/gestion/cv/[postulacion]">) {
  const sinCache = { "Cache-Control": "private, no-store" };
  const sesion = await obtenerSesionEmpresa();
  if (!sesion) return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: sinCache });

  const { postulacion } = await ctx.params;
  if (!esUuid(postulacion)) return NextResponse.json({ error: "No encontrado" }, { status: 404, headers: sinCache });

  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("postulaciones")
    .select("id, cv_path, nombre_revelado_at, vacante:vacantes(empresa_id)")
    .eq("id", postulacion)
    .maybeSingle<{ id: string; cv_path: string | null; nombre_revelado_at: string | null; vacante: { empresa_id: string } | null }>();

  // Mismo 404 si no existe o es de otra empresa: no se revela qué IDs existen.
  if (!data || data.vacante?.empresa_id !== sesion.empresa.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404, headers: sinCache });
  }
  if (!data.nombre_revelado_at) {
    return NextResponse.json(
      { error: "El CV original se habilita cuando se revela el nombre (entrevista final)." },
      { status: 403, headers: sinCache },
    );
  }
  if (!data.cv_path) return NextResponse.json({ error: "Esta postulación no tiene CV" }, { status: 404, headers: sinCache });

  const admin = crearClienteAdmin();
  const { data: firmada, error } = await admin.storage.from("cvs").createSignedUrl(data.cv_path, 60);
  if (error || !firmada) {
    console.error("[cv] createSignedUrl", error);
    return NextResponse.json({ error: "No se pudo abrir el CV" }, { status: 500, headers: sinCache });
  }

  await admin.from("registro_actividad").insert({
    empresa_id: sesion.empresa.id,
    usuario_id: sesion.usuarioId,
    accion: "ver_cv",
    tabla: "postulaciones",
    registro_id: data.id,
  });

  return NextResponse.redirect(firmada.signedUrl, { status: 302, headers: sinCache });
}
