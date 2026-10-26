"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { iniciarSesion } from "@/lib/auth/acciones";
import { ingresoInicial } from "@/lib/auth/estados";
import { type CamposIngreso, type Errores, hayErrores, validarIngreso } from "@/lib/auth/validacion";
import { BotonEnviar } from "./boton-enviar";
import { Campo } from "./campo";

const AVISOS: Record<string, string> = {
  cuenta: "Esta sección es solo para empresas. Ingresa con tu cuenta de empresa.",
  sesion: "Tu sesión terminó. Vuelve a ingresar.",
};

export function FormularioIngreso({ siguiente, aviso }: { siguiente?: string; aviso?: string }) {
  const [estado, accion, cargando] = useActionState(iniciarSesion, ingresoInicial);
  const [locales, setLocales] = useState<Errores<CamposIngreso> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const errores = locales ?? (estado.estado === "error" ? estado.errores : undefined) ?? {};
  const mensaje = estado.estado === "error" ? estado.mensaje : undefined;

  // Validamos en el navegador para responder rápido; el servidor vuelve a validar.
  // Se envía con startTransition para que React no limpie el formulario si hay un error.
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const e1 = validarIngreso({ correo: String(fd.get("correo") ?? ""), clave: String(fd.get("clave") ?? "") });
    if (hayErrores(e1)) {
      setLocales(e1);
      return;
    }
    setLocales(null);
    // Si el formulario se envió antes de leer ?siguiente= en el servidor, se toma de la URL.
    if (!fd.get("siguiente")) fd.set("siguiente", new URLSearchParams(window.location.search).get("siguiente") ?? "");
    startTransition(() => accion(fd));
  }

  const limpiar = (campo: keyof CamposIngreso) => () =>
    setLocales((prev) => (prev?.[campo] ? { ...prev, [campo]: undefined } : prev));

  // action= garantiza un POST aunque se envíe antes de que cargue el JS (nunca un GET
  // con la contraseña en la URL). Ya hidratado, onSubmit valida y envía con startTransition.
  return (
    <form ref={formRef} action={accion} onSubmit={enviar} noValidate className="auth-form">
      {aviso && AVISOS[aviso] && !mensaje && <div className="nota nota-az">{AVISOS[aviso]}</div>}
      {mensaje && (
        <div className="nota nota-error" role="alert">
          {mensaje}
        </div>
      )}
      {estado.estado === "aviso" && (
        <div className="nota nota-na" role="status">
          {estado.mensaje}
        </div>
      )}

      <input type="hidden" name="siguiente" value={siguiente ?? ""} />
      <Campo
        nombre="correo"
        etiqueta="Correo corporativo"
        tipo="email"
        autoComplete="email"
        inputMode="email"
        placeholder="nombre@empresa.com"
        error={errores.correo}
        onChange={limpiar("correo")}
      />
      <Campo
        nombre="clave"
        etiqueta="Contraseña"
        tipo="password"
        autoComplete="current-password"
        error={errores.clave}
        onChange={limpiar("clave")}
      />

      <BotonEnviar texto="Ingresar" textoCargando="Ingresando…" cargando={cargando} />

      <p className="centrado texto-gris">
        ¿Tu empresa aún no tiene cuenta? <Link href="/empresa/registro">Regístrala</Link>
      </p>
    </form>
  );
}
