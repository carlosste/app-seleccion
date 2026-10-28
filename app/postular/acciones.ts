"use server";

import { cookies } from "next/headers";
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
import { vacantePorToken } from "@/lib/vacante-publica";

const COOKIE_CORREO = "postulacion_correo";
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Igual al límite del bucket "cvs". Vercel corta los cuerpos de más de 4,5 MB.
const LIMITE_CV_BYTES = 4 * 1024 * 1024;
const VERSION_TEXTO = "v1";
const CONSENTIMIENTOS = ["datos", "grabacion"] as const;

function normalizarDocumento(texto: string) {
  return texto.replace(/[\s.-]/g, "").toUpperCase();
}

// El tipo de archivo lo manda el navegador y se puede falsear: se revisa la firma del PDF.
async function esPdfValido(cv: FormDataEntryValue | null) {
  if (!(cv instanceof File) || cv.size === 0 || cv.size > LIMITE_CV_BYTES) return false;
  const inicio = new Uint8Array(await cv.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...inicio) === "%PDF-";
}

// Paso 1: valida los datos y envía el código al correo. Si el documento ya tiene cuenta,
// solo sigue con el correo de esa cuenta: así la persona se postula a otra vacante sin
// crear una cuenta nueva (CLAUDE.md, "Postularse a otra vacante").
export async function enviarCodigo(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const pais = String(formData.get("pais") ?? "").trim().toUpperCase();
  const documento = normalizarDocumento(String(formData.get("documento") ?? ""));
  const aceptoDatos = formData.get("acepto") === "on";

  await vacantePorToken(token);

  const datosValidos =
    nombre.length >= 3 &&
    nombre.length <= 120 &&
    CORREO_VALIDO.test(correo) &&
    correo.length <= 254 &&
    telefono.length >= 7 &&
    telefono.length <= 20 &&
    /^[A-Z]{2}$/.test(pais) &&
    /^[A-Z0-9]{5,20}$/.test(documento) &&
    aceptoDatos;
  if (!datosValidos) redirect(`/postular/${token}?error=datos`);

  // Solo el servidor puede preguntar por documentos y correos (no es información pública).
  const admin = crearClienteAdmin();
  const [porDocumento, porCorreo] = await Promise.all([
    admin
      .from("postulantes")
      .select("id, correo")
      .eq("pais_documento", pais)
      .eq("numero_documento", documento)
      .maybeSingle<{ id: string; correo: string }>(),
    admin.from("postulantes").select("id").eq("correo", correo).maybeSingle<{ id: string }>(),
  ]);
  if (porDocumento.error || porCorreo.error) redirect(`/postular/${token}?error=general`);
  if (porDocumento.data && porDocumento.data.correo !== correo) redirect(`/postular/${token}?error=documento`);
  if (!porDocumento.data && porCorreo.data) redirect(`/postular/${token}?error=correo-documento`);
  const cuentaExistente = Boolean(porDocumento.data);

  // Máximo 3 códigos por hora al mismo correo (y un tope por red).
  const claveCorreo = clave("codigo-envio-correo", correo);
  const claveIp = clave("codigo-envio-ip", await obtenerIp());
  if (await consultarBloqueo([claveCorreo, claveIp])) redirect(`/postular/${token}?error=limite`);

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: cuentaExistente
      ? { shouldCreateUser: false }
      : { shouldCreateUser: true, data: { nombre, telefono, pais_documento: pais, numero_documento: documento } },
  });
  if (error) {
    redirect(`/postular/${token}?error=${error.code === "over_email_send_rate_limit" ? "espera" : "correo"}`);
  }
  await Promise.all([
    registrarIntento(claveCorreo, REGLAS.codigoEnvioCorreo),
    registrarIntento(claveIp, REGLAS.codigoEnvioIp),
  ]);

  // El correo queda en una cookie httpOnly: no viaja en la URL.
  (await cookies()).set(COOKIE_CORREO, correo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/postular",
    maxAge: 60 * 15,
  });
  redirect(`/postular/${token}/ingreso`);
}

// Paso 2: verifica el código, crea la contraseña (solo la primera vez), registra al postulante
// y crea su postulación con la hoja de vida.
export async function verificarCodigo(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const codigo = String(formData.get("codigo") ?? "").replace(/\s/g, "");
  const contrasena = String(formData.get("contrasena") ?? "");
  const cv = formData.get("cv");

  const almacen = await cookies();
  const correo = almacen.get(COOKIE_CORREO)?.value;
  if (!correo) redirect(`/postular/${token}?error=sesion`);

  const vacante = await vacantePorToken(token);
  const supabase = await crearClienteServidor();
  const admin = crearClienteAdmin();

  // 1. Se revisa lo que falta ANTES de usar el código (es de un solo uso): la contraseña
  //    solo la primera vez, y el CV solo si aún no se postuló a esta vacante.
  const { data: cuenta, error: errorCuenta } = await admin
    .from("postulantes")
    .select("id")
    .eq("correo", correo)
    .maybeSingle<{ id: string }>();
  if (errorCuenta) redirect(`/postular/${token}/ingreso?error=general`);
  const { data: previa } = cuenta
    ? await admin.from("postulaciones").select("id").eq("postulante_id", cuenta.id).eq("vacante_id", vacante.id).maybeSingle()
    : { data: null };

  if (!cuenta && contrasena.length < 8) redirect(`/postular/${token}/ingreso?error=clave`);
  if (!previa && !(await esPdfValido(cv))) redirect(`/postular/${token}/ingreso?error=cv`);

  // 2. Si ya entró con este correo (por ejemplo, reintenta tras un error), no se pide otro código.
  const {
    data: { user: actual },
  } = await supabase.auth.getUser();
  let usuario = actual?.email === correo ? actual : null;

  if (!usuario) {
    const claveCorreo = clave("codigo-fallo-correo", correo);
    const claveIp = clave("codigo-fallo-ip", await obtenerIp());
    if (await consultarBloqueo([claveCorreo, claveIp])) redirect(`/postular/${token}/ingreso?error=bloqueo`);

    const { data: verificado, error: errorCodigo } = await supabase.auth.verifyOtp({
      email: correo,
      token: codigo,
      type: "email",
    });
    if (errorCodigo || !verificado.user) {
      await Promise.all([
        registrarIntento(claveCorreo, REGLAS.codigoFalloCorreo),
        registrarIntento(claveIp, REGLAS.codigoFalloIp),
      ]);
      redirect(`/postular/${token}/ingreso?error=codigo`);
    }
    await limpiarIntentos(claveCorreo);
    usuario = verificado.user;
  }

  // 3. Una cuenta de empresa no se postula: se cierra la sesión que abrió el código.
  if ((usuario.app_metadata as { tipo?: string }).tipo === "empresa") {
    await supabase.auth.signOut({ scope: "local" });
    redirect(`/postular/${token}/ingreso?error=empresa`);
  }

  // 4. Primera vez: contraseña y registro del postulante.
  const { data: postulante, error: errorPostulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("id", usuario.id)
    .maybeSingle();
  if (errorPostulante) redirect(`/postular/${token}/ingreso?error=general`);

  if (!postulante) {
    if (contrasena.length < 8) redirect(`/postular/${token}/ingreso?error=clave`);

    const { error: errorClave } = await supabase.auth.updateUser({ password: contrasena });
    if (errorClave) {
      redirect(`/postular/${token}/ingreso?error=${errorClave.code === "weak_password" ? "clave-debil" : "general"}`);
    }

    const meta = usuario.user_metadata;
    const { error: errorRegistro } = await supabase.from("postulantes").insert({
      id: usuario.id,
      correo,
      nombre: meta.nombre,
      telefono: meta.telefono,
      pais_documento: meta.pais_documento,
      numero_documento: meta.numero_documento,
    });
    if (errorRegistro) redirect(`/postular/${token}?error=documento`);
  }

  // 5. Postulación a esta vacante (una por vacante).
  const { data: existente } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", usuario.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle<{ id: string }>();
  let postulacionId = existente?.id;

  if (!postulacionId) {
    if (!(await esPdfValido(cv))) redirect(`/postular/${token}/ingreso?error=cv`);

    const ruta = `${usuario.id}/${vacante.id}.pdf`;
    const { error: errorSubida } = await supabase.storage
      .from("cvs")
      .upload(ruta, cv as File, { contentType: "application/pdf", upsert: true });
    if (errorSubida) redirect(`/postular/${token}/ingreso?error=general`);

    // La base exige que la postulación empiece en la primera etapa de la vacante.
    const { data: nueva, error: errorPostulacion } = await supabase
      .from("postulaciones")
      .insert({
        postulante_id: usuario.id,
        vacante_id: vacante.id,
        cv_path: ruta,
        etapa_actual_id: vacante.primera_etapa_id,
      })
      .select("id")
      .single<{ id: string }>();
    if (errorPostulacion || !nueva) {
      const limite = errorPostulacion?.message.includes("límite de postulantes");
      redirect(`/postular/${token}/ingreso?error=${limite ? "limite" : "general"}`);
    }
    postulacionId = nueva.id;
  }

  // 6. Consentimientos (Ley 1581): se completan en cada ingreso, por si un intento anterior
  //    creó la postulación pero no alcanzó a guardarlos.
  const { data: dados } = await supabase
    .from("consentimientos")
    .select("tipo")
    .eq("postulacion_id", postulacionId)
    .returns<{ tipo: string }[]>();
  const faltan = CONSENTIMIENTOS.filter((tipo) => !(dados ?? []).some((d) => d.tipo === tipo));
  if (faltan.length) {
    const { error: errorConsentimientos } = await supabase
      .from("consentimientos")
      .insert(faltan.map((tipo) => ({ postulacion_id: postulacionId, tipo, version_texto: VERSION_TEXTO })));
    if (errorConsentimientos) redirect(`/postular/${token}/ingreso?error=general`);
  }

  // La cookie se creó con path /postular: se borra con ese mismo path.
  almacen.set(COOKIE_CORREO, "", { path: "/postular", maxAge: 0 });
  redirect(`/postular/${token}/preguntas`);
}
