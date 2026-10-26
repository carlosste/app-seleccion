import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type SesionEmpresa = {
  usuarioId: string;
  correo: string;
  nombre: string | null;
  rol: "gestion_humana" | "entrevistador";
  empresa: { id: string; nombre: string; logoUrl: string | null };
};

type FilaUsuarioEmpresa = {
  id: string;
  nombre: string | null;
  rol: SesionEmpresa["rol"];
  empresa: { id: string; nombre: string; logo_url: string | null } | null;
};

// Capa de acceso a datos (DAL): la única puerta para saber "quién es la empresa".
// - getUser() pregunta al servidor de Auth (detecta sesiones cerradas o revocadas).
// - La fila en usuarios_empresa es la fuente de verdad del rol, no el JWT.
// cache() evita repetir la consulta dentro de la misma petición.
export const obtenerSesionEmpresa = cache(async (): Promise<SesionEmpresa | null> => {
  // La sesión depende de la petición y del reloj (expiración del JWT): nunca se prerenderiza.
  await connection();
  const supabase = await crearClienteServidor();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;

  const { data } = await supabase
    .from("usuarios_empresa")
    .select("id, nombre, rol, empresa:empresas(id, nombre, logo_url)")
    .eq("id", auth.user.id)
    .maybeSingle<FilaUsuarioEmpresa>();

  if (!data?.empresa) return null;

  return {
    usuarioId: data.id,
    correo: auth.user.email ?? "",
    nombre: data.nombre,
    rol: data.rol,
    empresa: { id: data.empresa.id, nombre: data.empresa.nombre, logoUrl: data.empresa.logo_url },
  };
});

// Para páginas y acciones del panel: si no hay empresa, fuera.
export async function requerirEmpresa(): Promise<SesionEmpresa> {
  const sesion = await obtenerSesionEmpresa();
  if (!sesion) redirect("/empresa/ingreso");
  return sesion;
}
