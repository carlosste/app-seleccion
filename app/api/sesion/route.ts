import { NextResponse } from "next/server";
import { obtenerSesionEmpresa } from "@/lib/auth/sesion-empresa";

// La página de inicio es HTML estático (public/inicio): pregunta aquí si hay una empresa con
// sesión para cambiar "Iniciar sesión / Registrar empresa" por el menú de la cuenta.
// Solo devuelve lo que la persona ya ve de sí misma en el panel: nombre, correo y empresa.
export async function GET() {
  const sesion = await obtenerSesionEmpresa();
  const cuerpo = sesion
    ? { sesion: { nombre: sesion.nombre, correo: sesion.correo, empresa: sesion.empresa.nombre } }
    : { sesion: null };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "private, no-store" } });
}
