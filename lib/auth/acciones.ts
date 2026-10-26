"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { EstadoIngreso, EstadoRegistro } from "./estados";
import {
  REGLAS,
  clave,
  consultarBloqueo,
  limpiarIntentos,
  minutosRestantes,
  obtenerIp,
  registrarIntento,
} from "./limite-intentos";
import {
  type CamposIngreso,
  type CamposRegistro,
  esCorreoPersonal,
  hayErrores,
  limpiarNit,
  normalizarCorreo,
  validarIngreso,
  validarRegistro,
} from "./validacion";

// Mismo mensaje para "no existe", "contraseña mala" y "no es cuenta de empresa":
// así nadie puede averiguar qué correos están registrados.
const MENSAJE_GENERICO =
  "Correo o contraseña incorrectos. Si eres postulante, ingresa desde el enlace de tu vacante.";

function texto(fd: FormData, campo: string) {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
}

// Solo se permite volver a rutas internas del panel (evita redirecciones abiertas).
function destinoSeguro(siguiente: string) {
  return /^\/gestion(\/[\w\-/]*)?$/.test(siguiente) ? siguiente : "/gestion";
}

// Si el formulario se envió antes de que cargara (sin JS), el destino viene en la URL
// de la página de ingreso. destinoSeguro() lo valida igual.
async function siguienteDesdeReferer() {
  try {
    return new URL((await headers()).get("referer") ?? "").searchParams.get("siguiente") ?? "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Registro de empresa
// ---------------------------------------------------------------------------
export async function registrarEmpresa(_previo: EstadoRegistro, fd: FormData): Promise<EstadoRegistro> {
  const c: CamposRegistro = {
    nombreEmpresa: texto(fd, "nombreEmpresa"),
    nit: texto(fd, "nit"),
    sector: texto(fd, "sector"),
    tamano: texto(fd, "tamano"),
    ciudad: texto(fd, "ciudad"),
    telefono: texto(fd, "telefono"),
    sitioWeb: texto(fd, "sitioWeb"),
    nombreResponsable: texto(fd, "nombreResponsable"),
    correo: texto(fd, "correo"),
    clave: texto(fd, "clave"),
    confirmarClave: texto(fd, "confirmarClave"),
    aceptaTerminos: texto(fd, "aceptaTerminos"),
  };

  // 1. Validación (la misma del navegador, pero aquí es la que cuenta).
  const errores = validarRegistro(c);
  if (!errores.correo && process.env.PERMITIR_CORREOS_PERSONALES !== "true" && esCorreoPersonal(c.correo)) {
    errores.correo = "Usa el correo corporativo de la empresa (no Gmail, Hotmail, Outlook…).";
  }
  if (hayErrores(errores)) return { estado: "error", errores };

  // 2. Límite de registros por IP.
  const claveIp = clave("registro-ip", await obtenerIp());
  const bloqueo = await consultarBloqueo([claveIp]);
  if (bloqueo) {
    return { estado: "error", mensaje: `Demasiados registros desde esta red. Intenta en ${minutosRestantes(bloqueo)} minutos.` };
  }
  await registrarIntento(claveIp, REGLAS.registroIp);

  const correo = normalizarCorreo(c.correo);
  const admin = crearClienteAdmin();

  // 3. Crear el usuario en Supabase Auth: guarda la contraseña con bcrypt.
  //    createUser nunca modifica una cuenta existente: si el correo ya está, falla.
  //    Sin confirmación por correo: la cuenta queda activa al crearse.
  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email: correo,
    password: c.clave,
    email_confirm: true,
    user_metadata: { nombre: c.nombreResponsable.trim() },
  });

  if (errorAuth || !creado.user) {
    if (errorAuth?.code === "email_exists" || errorAuth?.code === "user_already_exists") {
      return { estado: "error", errores: { correo: "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo." } };
    }
    if (errorAuth?.code === "weak_password") {
      return { estado: "error", errores: { clave: "La contraseña es demasiado débil o aparece en filtraciones conocidas. Elige otra." } };
    }
    console.error("[registro] createUser", errorAuth);
    return { estado: "error", mensaje: "No pudimos crear la cuenta. Intenta de nuevo en unos minutos." };
  }

  // 4. Empresa + usuario de gestión humana + tipo de cuenta, en una transacción.
  const { error: errorEmpresa } = await admin.rpc("registrar_empresa", {
    p_usuario: creado.user.id,
    p_nombre_responsable: c.nombreResponsable.trim(),
    p_nombre_empresa: c.nombreEmpresa.trim(),
    p_nit: limpiarNit(c.nit),
    p_sector: c.sector,
    p_ciudad: c.ciudad.trim(),
    p_telefono: c.telefono.trim(),
    p_sitio_web: c.sitioWeb.trim(),
    p_tamano: c.tamano,
  });

  if (errorEmpresa) {
    console.error("[registro] registrar_empresa", errorEmpresa);
    await admin.auth.admin.deleteUser(creado.user.id); // no dejar cuentas a medias
    return { estado: "error", mensaje: "No pudimos crear la cuenta. Intenta de nuevo en unos minutos." };
  }

  return { estado: "ok", correo };
}

// ---------------------------------------------------------------------------
// Inicio de sesión de empresa
// ---------------------------------------------------------------------------
export async function iniciarSesion(_previo: EstadoIngreso, fd: FormData): Promise<EstadoIngreso> {
  const c: CamposIngreso = { correo: texto(fd, "correo"), clave: texto(fd, "clave") };
  const errores = validarIngreso(c);
  if (hayErrores(errores)) return { estado: "error", errores };

  const correo = normalizarCorreo(c.correo);
  const claveCorreo = clave("ingreso-correo", correo);
  const claveIp = clave("ingreso-ip", await obtenerIp());

  // 1. ¿Bloqueado? Se revisa antes de tocar Auth, exista o no el correo.
  const bloqueo = await consultarBloqueo([claveCorreo, claveIp]);
  if (bloqueo) {
    return { estado: "error", mensaje: `Demasiados intentos. Intenta de nuevo en ${minutosRestantes(bloqueo)} minutos.` };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: c.clave });

  if (error || !data.user) {
    // Cuentas creadas antes de quitar la confirmación por correo: Supabase exige confirmarlas.
    if (error?.code === "email_not_confirmed") {
      return { estado: "aviso", mensaje: "Tu cuenta aún no está activada. Pide que la activen para poder entrar." };
    }
    if (error?.code === "over_request_rate_limit") {
      return { estado: "error", mensaje: "Demasiados intentos. Espera unos minutos y vuelve a intentar." };
    }
    await Promise.all([
      registrarIntento(claveCorreo, REGLAS.ingresoCorreo),
      registrarIntento(claveIp, REGLAS.ingresoIp),
    ]);
    return { estado: "error", mensaje: MENSAJE_GENERICO };
  }

  // 2. Separación de roles: solo cuentas de empresa con fila en usuarios_empresa.
  const tipo = (data.user.app_metadata as { tipo?: string }).tipo;
  const { data: fila } = await supabase.from("usuarios_empresa").select("id").eq("id", data.user.id).maybeSingle();
  if (tipo !== "empresa" || !fila) {
    await supabase.auth.signOut({ scope: "local" });
    await registrarIntento(claveCorreo, REGLAS.ingresoCorreo);
    return { estado: "error", mensaje: MENSAJE_GENERICO };
  }

  await limpiarIntentos(claveCorreo);
  redirect(destinoSeguro(texto(fd, "siguiente") || (await siguienteDesdeReferer())));
}

// ---------------------------------------------------------------------------
// Cerrar sesión
// ---------------------------------------------------------------------------
export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/empresa/ingreso");
}
