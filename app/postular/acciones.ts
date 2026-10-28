"use server";

import { redirect } from "next/navigation";
import {
  REGLAS,
  clave,
  consultarBloqueo,
  limpiarIntentos,
  obtenerIp,
  registrarIntento,
} from "@/lib/auth/limite-intentos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { vacantePorToken, type VacantePublica } from "@/lib/vacante-publica";

// MODO DE PRUEBAS (2026-10-28, decisión de Carlos): no se envían correos. El postulante entra
// con ID = número de documento y contraseña = número de documento. Es inseguro a propósito
// mientras no haya dominio ni proveedor de correo; ver CLAUDE.md, "Pendientes".

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Supabase pide contraseñas de al menos 6 caracteres: el documento también.
const DOCUMENTO_VALIDO = /^[A-Z0-9]{6,20}$/;
// El país ya no se pide. La base exige país junto al número, así que se guarda uno fijo.
const PAIS_POR_DEFECTO = "CO";
// Igual al límite del bucket "cvs". Vercel corta los cuerpos de más de 4,5 MB.
const LIMITE_CV_BYTES = 4 * 1024 * 1024;
const VERSION_TEXTO = "v1";
const CONSENTIMIENTOS = ["datos", "grabacion"] as const;

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

function normalizarDocumento(texto: string) {
  return texto.replace(/[\s.-]/g, "").toUpperCase();
}

// El tipo de archivo lo manda el navegador y se puede falsear: se revisa la firma del PDF.
async function esPdfValido(cv: FormDataEntryValue | null): Promise<boolean> {
  if (!(cv instanceof File) || cv.size === 0 || cv.size > LIMITE_CV_BYTES) return false;
  const inicio = new Uint8Array(await cv.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...inicio) === "%PDF-";
}

function buscarPorDocumento(documento: string) {
  return crearClienteAdmin()
    .from("postulantes")
    .select("id, correo")
    .eq("pais_documento", PAIS_POR_DEFECTO)
    .eq("numero_documento", documento)
    .maybeSingle<{ id: string; correo: string }>();
}

// Sube el CV, crea la postulación (si aún no existe) y completa los consentimientos.
// Devuelve un código de error para la URL, o null si todo salió bien.
async function asegurarPostulacion(
  supabase: Cliente,
  usuarioId: string,
  vacante: VacantePublica,
  cv: FormDataEntryValue | null,
): Promise<string | null> {
  const { data: existente } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", usuarioId)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string }>();
  let postulacionId = existente?.id;

  if (!postulacionId) {
    const ruta = `${usuarioId}/${vacante.id}.pdf`;
    const { error: errorSubida } = await supabase.storage
      .from("cvs")
      .upload(ruta, cv as File, { contentType: "application/pdf", upsert: true });
    if (errorSubida) {
      console.error("[postulacion] subir CV", errorSubida);
      return "general";
    }

    // La base exige que la postulación empiece en la primera etapa de la vacante.
    const { data: nueva, error: errorPostulacion } = await supabase
      .from("postulaciones")
      .insert({ postulante_id: usuarioId, vacante_id: vacante.id, cv_path: ruta, etapa_actual_id: vacante.primera_etapa_id })
      .select("id")
      .single<{ id: string }>();
    if (errorPostulacion || !nueva) {
      console.error("[postulacion] insert", errorPostulacion);
      return errorPostulacion?.message.includes("límite de postulantes") ? "limite" : "general";
    }
    postulacionId = nueva.id;
  }

  // Consentimientos (Ley 1581): se completan siempre, por si un intento anterior no alcanzó.
  const { data: dados } = await supabase
    .from("consentimientos")
    .select("tipo")
    .eq("postulacion_id", postulacionId)
    .returns<{ tipo: string }[]>();
  const faltan = CONSENTIMIENTOS.filter((tipo) => !(dados ?? []).some((d) => d.tipo === tipo));
  if (faltan.length) {
    const { error } = await supabase
      .from("consentimientos")
      .insert(faltan.map((tipo) => ({ postulacion_id: postulacionId, tipo, version_texto: VERSION_TEXTO })));
    if (error) {
      console.error("[postulacion] consentimientos", error);
      return "general";
    }
  }
  return null;
}

// Pantalla 1: datos + hoja de vida. Crea la cuenta (sin correo de confirmación), abre la
// sesión y crea la postulación. Si el documento ya tiene cuenta con ese mismo correo, se
// usa esa cuenta: así la persona se postula a otra vacante sin crear otra.
export async function postularse(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const documento = normalizarDocumento(String(formData.get("documento") ?? ""));
  const aceptoDatos = formData.get("acepto") === "on";
  const cv = formData.get("cv");

  const vacante = await vacantePorToken(token);
  const volver: (error: string) => never = (error) => redirect(`/postular/${token}?error=${error}`);

  const datosValidos =
    nombre.length >= 3 &&
    nombre.length <= 120 &&
    CORREO_VALIDO.test(correo) &&
    correo.length <= 254 &&
    telefono.length >= 7 &&
    telefono.length <= 20 &&
    DOCUMENTO_VALIDO.test(documento) &&
    aceptoDatos;
  if (!datosValidos) volver("datos");
  if (!(await esPdfValido(cv))) volver("cv");

  const claveIp = clave("postulacion-ip", await obtenerIp());
  if (await consultarBloqueo([claveIp])) volver("limite-intentos");
  await registrarIntento(claveIp, REGLAS.postulacionIp);

  const admin = crearClienteAdmin();
  const [porDocumento, porCorreo] = await Promise.all([
    buscarPorDocumento(documento),
    admin.from("postulantes").select("id").eq("correo", correo).maybeSingle<{ id: string }>(),
  ]);
  if (porDocumento.error || porCorreo.error) volver("general");
  if (porDocumento.data && porDocumento.data.correo !== correo) volver("documento");
  if (!porDocumento.data && porCorreo.data) volver("correo-documento");

  // Cuenta nueva: se crea ya confirmada, así Supabase no envía ningún correo.
  if (!porDocumento.data) {
    const { data: creado, error: errorCrear } = await admin.auth.admin.createUser({
      email: correo,
      password: documento,
      email_confirm: true,
      user_metadata: { nombre, telefono },
    });
    if (errorCrear || !creado.user) {
      console.error("[postulacion] crear cuenta", errorCrear);
      volver(errorCrear?.code === "email_exists" ? "correo-registrado" : "general");
    }
  }

  // Se abre la sesión con la contraseña (el documento) y se guarda el postulante con su sesión.
  const supabase = await crearClienteServidor();
  const { data: sesion, error: errorSesion } = await supabase.auth.signInWithPassword({ email: correo, password: documento });
  if (errorSesion || !sesion.user) {
    console.error("[postulacion] iniciar sesion", errorSesion);
    volver("general");
  }
  const usuario = sesion.user;
  if ((usuario.app_metadata as { tipo?: string }).tipo === "empresa") {
    await supabase.auth.signOut({ scope: "local" });
    volver("empresa");
  }

  if (!porDocumento.data) {
    const { error: errorRegistro } = await supabase.from("postulantes").insert({
      id: usuario.id,
      correo,
      nombre,
      telefono,
      pais_documento: PAIS_POR_DEFECTO,
      numero_documento: documento,
    });
    if (errorRegistro) {
      // Otro registro ganó el documento al mismo tiempo: no dejar la cuenta a medias.
      console.error("[postulacion] registrar postulante", errorRegistro);
      await supabase.auth.signOut({ scope: "local" });
      await admin.auth.admin.deleteUser(usuario.id);
      volver("documento");
    }
  }

  const error = await asegurarPostulacion(supabase, usuario.id, vacante, cv);
  if (error) volver(error);
  redirect(`/postular/${token}/preguntas`);
}

// Pantalla 2: volver a entrar con ID (documento) y contraseña (documento).
// 5 intentos fallidos bloquean 15 minutos, por documento y por red.
export async function ingresar(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const id = normalizarDocumento(String(formData.get("id") ?? ""));
  const contrasena = String(formData.get("contrasena") ?? "");

  const vacante = await vacantePorToken(token);
  const volver: (error: string) => never = (error) => redirect(`/postular/${token}/ingreso?error=${error}`);
  if (!DOCUMENTO_VALIDO.test(id) || !contrasena) volver("credenciales");

  const claveId = clave("postulante-id", id);
  const claveIp = clave("postulante-ip", await obtenerIp());
  if (await consultarBloqueo([claveId, claveIp])) volver("bloqueo");

  const fallo = async () => {
    await Promise.all([registrarIntento(claveId, REGLAS.ingresoCorreo), registrarIntento(claveIp, REGLAS.ingresoIp)]);
    volver("credenciales");
  };

  const { data: cuenta, error: errorCuenta } = await buscarPorDocumento(id);
  if (errorCuenta) volver("general");
  if (!cuenta) return fallo();

  const supabase = await crearClienteServidor();
  const { data: sesion, error } = await supabase.auth.signInWithPassword({ email: cuenta.correo, password: contrasena });
  if (error || !sesion.user) return fallo();
  await limpiarIntentos(claveId);

  // Si todavía no se postuló a esta vacante, se le pide el formulario con el CV.
  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", sesion.user.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle();
  if (!postulacion) redirect(`/postular/${token}?error=sin-postulacion`);
  redirect(`/postular/${token}/preguntas`);
}

const LARGO_RESPUESTA = 3000;

export type ResultadoRespuesta = { ok: true; fin?: boolean } | { ok: false; mensaje: string };

// Pantalla 3: guarda una respuesta. Por ahora las preguntas de voz también se responden
// por escrito (decisión de Carlos, 2026-10-28). La base (puede_responder) revisa que la
// pregunta sea de una etapa que ya alcanzó y que la postulación siga en proceso.
export async function responderPregunta(token: string, preguntaId: string, texto: string): Promise<ResultadoRespuesta> {
  const limpio = texto.trim();
  if (limpio.length < 2 || limpio.length > LARGO_RESPUESTA) {
    return { ok: false, mensaje: `Escribe tu respuesta (máximo ${LARGO_RESPUESTA} caracteres).` };
  }
  if (!/^[0-9a-f-]{36}$/i.test(preguntaId)) return { ok: false, mensaje: "Pregunta no válida." };

  const vacante = await vacantePorToken(token);
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "Tu sesión venció. Vuelve a ingresar con tu ID y contraseña." };

  const { data: postulacion } = await supabase
    .from("postulaciones")
    .select("id, estado")
    .eq("postulante_id", user.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string; estado: string }>();
  if (!postulacion) return { ok: false, mensaje: "Aún no te has postulado a esta vacante." };
  // La revisión de CV es interna: si quedó descartada, el postulante solo ve que terminó.
  if (postulacion.estado !== "en_proceso") return { ok: true, fin: true };

  const { error } = await supabase
    .from("respuestas")
    .insert({ postulacion_id: postulacion.id, pregunta_id: preguntaId, modalidad: "texto", texto: limpio });
  if (error) {
    // Ya estaba respondida (doble clic o dos pestañas): para el postulante no es un error.
    if (error.code === "23505") return { ok: true };
    console.error("[postulacion] responder", error);
    return { ok: false, mensaje: "No pudimos guardar tu respuesta. Intenta de nuevo." };
  }
  return { ok: true };
}
