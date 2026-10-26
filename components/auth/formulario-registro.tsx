"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { registrarEmpresa } from "@/lib/auth/acciones";
import { registroInicial } from "@/lib/auth/estados";
import {
  type CamposRegistro,
  type Errores,
  type FuerzaClave,
  SECTORES,
  TAMANOS,
  evaluarClave,
  hayErrores,
  validarRegistro,
} from "@/lib/auth/validacion";
import { BotonEnviar } from "./boton-enviar";
import { Campo, Selector } from "./campo";

type Nombre = keyof CamposRegistro;

const NIVELES = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];

function leer(form: HTMLFormElement): CamposRegistro {
  const fd = new FormData(form);
  const v = (k: Nombre) => String(fd.get(k) ?? "");
  return {
    nombreEmpresa: v("nombreEmpresa"),
    nit: v("nit"),
    sector: v("sector"),
    tamano: v("tamano"),
    ciudad: v("ciudad"),
    telefono: v("telefono"),
    sitioWeb: v("sitioWeb"),
    nombreResponsable: v("nombreResponsable"),
    correo: v("correo"),
    clave: v("clave"),
    confirmarClave: v("confirmarClave"),
    aceptaTerminos: v("aceptaTerminos"),
  };
}

export function FormularioRegistro() {
  const [estado, accion, cargando] = useActionState(registrarEmpresa, registroInicial);
  const formRef = useRef<HTMLFormElement>(null);

  // Errores del navegador: se muestran solo en campos ya tocados (o tras enviar).
  const [locales, setLocales] = useState<Errores<CamposRegistro>>({});
  const [tocados, setTocados] = useState<Set<Nombre>>(new Set());
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  // Errores del servidor que el usuario ya corrigió (editó el campo).
  const [corregidos, setCorregidos] = useState<Set<Nombre>>(new Set());
  const [fuerza, setFuerza] = useState<FuerzaClave | null>(null);

  const servidor = estado.estado === "error" ? estado.errores ?? {} : {};
  const error = (campo: Nombre) =>
    ((intentoEnvio || tocados.has(campo)) && locales[campo]) ||
    (!corregidos.has(campo) ? servidor[campo] : undefined) ||
    undefined;

  function revalidar(campo?: Nombre) {
    if (!formRef.current) return;
    const datos = leer(formRef.current);
    setLocales(validarRegistro(datos));
    if (campo) setTocados((t) => new Set(t).add(campo));
    if (campo === "clave" || campo === "correo" || campo === "nombreEmpresa") {
      setFuerza(
        datos.clave ? evaluarClave(datos.clave, [datos.correo.split("@")[0] ?? "", datos.nombreEmpresa]) : null,
      );
    }
  }

  const alSalir = (campo: Nombre) => () => revalidar(campo);
  const alCambiar = (campo: Nombre) => () => {
    setCorregidos((c) => new Set(c).add(campo));
    // Mientras escribe solo revalidamos campos que ya mostraban error, y la fuerza de la clave.
    if (tocados.has(campo) || intentoEnvio || campo === "clave") revalidar(campo === "clave" ? undefined : campo);
    if (campo === "clave" && formRef.current) {
      const d = leer(formRef.current);
      setFuerza(d.clave ? evaluarClave(d.clave, [d.correo.split("@")[0] ?? "", d.nombreEmpresa]) : null);
    }
  };

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const errores = validarRegistro(leer(form));
    setLocales(errores);
    setIntentoEnvio(true);
    if (hayErrores(errores)) {
      // Lleva el foco al primer campo con error.
      const primero = Object.keys(errores)[0];
      (form.elements.namedItem(primero) as HTMLElement | null)?.focus();
      return;
    }
    setCorregidos(new Set());
    startTransition(() => accion(new FormData(form)));
  }

  if (estado.estado === "ok") {
    return (
      <div className="auth-form" role="status">
        <div className="icono-ok" aria-hidden="true">
          ✓
        </div>
        <h2 className="centrado" style={{ fontSize: 20 }}>
          Cuenta creada
        </h2>
        <p className="centrado texto-gris" style={{ lineHeight: 1.5 }}>
          Tu cuenta para <b>{estado.correo}</b> ya está lista. Inicia sesión para entrar al panel de tu empresa.
        </p>
        <Link href="/empresa/ingreso" className="btn btn-sec">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  const mensaje = estado.estado === "error" ? estado.mensaje : undefined;

  // action= garantiza un POST aunque se envíe antes de que cargue el JS (nunca un GET
  // con la contraseña en la URL). Ya hidratado, onSubmit valida y envía con startTransition.
  return (
    <form ref={formRef} action={accion} onSubmit={enviar} noValidate className="auth-form">
      {mensaje && (
        <div className="nota nota-error" role="alert">
          {mensaje}
        </div>
      )}

      <fieldset className="grupo">
        <legend>Datos de la empresa</legend>
        <Campo nombre="nombreEmpresa" etiqueta="Nombre o razón social" autoComplete="organization" maxLength={120}
          error={error("nombreEmpresa")} onBlur={alSalir("nombreEmpresa")} onChange={alCambiar("nombreEmpresa")} />
        <div className="fila-2">
          <Campo nombre="nit" etiqueta="NIT" placeholder="900123456-8" inputMode="numeric" maxLength={14}
            ayuda="Con o sin dígito de verificación." error={error("nit")} onBlur={alSalir("nit")} onChange={alCambiar("nit")} />
          <Campo nombre="telefono" etiqueta="Teléfono de contacto" tipo="tel" autoComplete="tel" placeholder="602 555 1234"
            error={error("telefono")} onBlur={alSalir("telefono")} onChange={alCambiar("telefono")} />
        </div>
        <div className="fila-2">
          <Selector nombre="sector" etiqueta="Sector" opciones={SECTORES} error={error("sector")}
            onChange={() => { alCambiar("sector")(); revalidar("sector"); }} />
          <Selector nombre="tamano" etiqueta="Número de empleados" opciones={TAMANOS} error={error("tamano")}
            onChange={() => { alCambiar("tamano")(); revalidar("tamano"); }} />
        </div>
        <div className="fila-2">
          <Campo nombre="ciudad" etiqueta="Ciudad" autoComplete="address-level2" placeholder="Cali" maxLength={80}
            error={error("ciudad")} onBlur={alSalir("ciudad")} onChange={alCambiar("ciudad")} />
          <Campo nombre="sitioWeb" etiqueta="Sitio web" tipo="url" autoComplete="url" placeholder="https://empresa.com" opcional
            error={error("sitioWeb")} onBlur={alSalir("sitioWeb")} onChange={alCambiar("sitioWeb")} />
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Tu cuenta (gestión humana)</legend>
        <Campo nombre="nombreResponsable" etiqueta="Tu nombre" autoComplete="name" maxLength={100}
          error={error("nombreResponsable")} onBlur={alSalir("nombreResponsable")} onChange={alCambiar("nombreResponsable")} />
        <Campo nombre="correo" etiqueta="Correo corporativo" tipo="email" autoComplete="email" inputMode="email"
          placeholder="nombre@empresa.com"
          error={error("correo")} onBlur={alSalir("correo")} onChange={alCambiar("correo")} />
        <Campo nombre="clave" etiqueta="Contraseña" tipo="password" autoComplete="new-password" maxLength={72}
          error={error("clave")} onBlur={alSalir("clave")} onChange={alCambiar("clave")} />
        {fuerza && <MedidorClave fuerza={fuerza} />}
        <Campo nombre="confirmarClave" etiqueta="Repite la contraseña" tipo="password" autoComplete="new-password" maxLength={72}
          error={error("confirmarClave")} onBlur={alSalir("confirmarClave")} onChange={alCambiar("confirmarClave")} />
      </fieldset>

      <div className="campo">
        <label className="check">
          <input type="checkbox" name="aceptaTerminos" value="si"
            aria-invalid={Boolean(error("aceptaTerminos"))}
            onChange={() => { alCambiar("aceptaTerminos")(); revalidar("aceptaTerminos"); }} />
          <span>
            Acepto la política de tratamiento de datos personales (Ley 1581 de 2012) y me comprometo a usar los datos
            de los postulantes solo para este proceso de selección.
          </span>
        </label>
        {error("aceptaTerminos") && <span className="campo-error">{error("aceptaTerminos")}</span>}
      </div>

      <BotonEnviar texto="Crear cuenta de empresa" textoCargando="Creando cuenta…" cargando={cargando} />

      <p className="centrado texto-gris">
        ¿Ya tienes cuenta? <Link href="/empresa/ingreso">Inicia sesión</Link>
      </p>
    </form>
  );
}

function MedidorClave({ fuerza }: { fuerza: FuerzaClave }) {
  return (
    <div className="medidor" aria-live="polite">
      <div className="medidor-barras" data-nivel={fuerza.nivel}>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= fuerza.nivel ? "on" : undefined} />
        ))}
      </div>
      <span className="campo-ayuda">
        Seguridad: <b>{NIVELES[fuerza.nivel]}</b>
        {fuerza.problemas.length > 0 && ` · ${fuerza.problemas.join(" ")}`}
      </span>
    </div>
  );
}
