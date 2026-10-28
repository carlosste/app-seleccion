"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { vacantePorToken } from "@/lib/vacante-publica";

const COOKIE_CORREO = "postulacion_correo";
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Igual al límite del bucket "cvs". Vercel corta los cuerpos de más de 4,5 MB.
const LIMITE_CV_BYTES = 4 * 1024 * 1024;
const VERSION_TEXTO = "v1";

function normalizarDocumento(texto: string) {
  return texto.replace(/[\s.-]/g, "").toUpperCase();
}

// Paso 1: valida los datos, revisa que el documento no tenga cuenta y envía el código al correo.
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
    CORREO_VALIDO.test(correo) &&
    telefono.length >= 7 &&
    /^[A-Z]{2}$/.test(pais) &&
    /^[A-Z0-9]{5,20}$/.test(documento) &&
    aceptoDatos;
  if (!datosValidos) redirect(`/postular/${token}?error=datos`);

  const supabase = await crearClienteServidor();

  // Solo el servidor puede preguntar si un documento tiene cuenta (no es pública).
  const { data: disponible, error: errorDisponible } = await crearClienteAdmin().rpc("documento_disponible", {
    p_pais: pais,
    p_numero: documento,
  });
  if (errorDisponible) redirect(`/postular/${token}?error=general`);
  if (!disponible) redirect(`/postular/${token}?error=documento`);

  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: {
      shouldCreateUser: true,
      data: { nombre, telefono, pais_documento: pais, numero_documento: documento },
    },
  });
  if (error) redirect(`/postular/${token}?error=correo`);

  // El correo queda en una cookie httpOnly: no viaja en la URL.
  (await cookies()).set(COOKIE_CORREO, correo, {
    httpOnly: true,
    sameSite: "lax",
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

  const { data: verificado, error: errorCodigo } = await supabase.auth.verifyOtp({
    email: correo,
    token: codigo,
    type: "email",
  });
  if (errorCodigo || !verificado.user) redirect(`/postular/${token}/ingreso?error=codigo`);
  const usuario = verificado.user;

  const { data: postulante, error: errorPostulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("id", usuario.id)
    .maybeSingle();
  if (errorPostulante) redirect(`/postular/${token}/ingreso?error=general`);

  if (!postulante) {
    if (contrasena.length < 8) redirect(`/postular/${token}/ingreso?error=clave`);

    const { error: errorClave } = await supabase.auth.updateUser({ password: contrasena });
    if (errorClave) redirect(`/postular/${token}/ingreso?error=general`);

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

  const { data: existente } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", usuario.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle();

  if (!existente) {
    if (!(cv instanceof File) || cv.size === 0 || cv.type !== "application/pdf" || cv.size > LIMITE_CV_BYTES) {
      redirect(`/postular/${token}/ingreso?error=cv`);
    }

    const ruta = `${usuario.id}/${vacante.id}.pdf`;
    const { error: errorSubida } = await supabase.storage
      .from("cvs")
      .upload(ruta, cv, { contentType: "application/pdf", upsert: true });
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
      .single();
    if (errorPostulacion) redirect(`/postular/${token}/ingreso?error=general`);

    const { error: errorConsentimientos } = await supabase.from("consentimientos").insert([
      { postulacion_id: nueva.id, tipo: "datos", version_texto: VERSION_TEXTO },
      { postulacion_id: nueva.id, tipo: "grabacion", version_texto: VERSION_TEXTO },
    ]);
    if (errorConsentimientos) redirect(`/postular/${token}/ingreso?error=general`);
  }

  almacen.delete(COOKIE_CORREO);
  redirect(`/postular/${token}/preguntas`);
}
