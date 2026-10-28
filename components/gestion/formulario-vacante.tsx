"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BotonEnviar } from "@/components/auth/boton-enviar";
import { Campo } from "@/components/auth/campo";
import { crearVacante } from "@/lib/gestion/vacantes";
import { vacanteInicial } from "@/lib/gestion/estados";

export function FormularioVacante() {
  const [estado, accion, cargando] = useActionState(crearVacante, vacanteInicial);

  const errores = estado.estado === "error" ? estado.errores ?? {} : {};
  const mensaje = estado.estado === "error" ? estado.mensaje : undefined;

  return (
    <form action={accion} noValidate className="auth-form">
      {mensaje && (
        <div className="nota nota-error" role="alert">
          {mensaje}
        </div>
      )}

      <Campo
        nombre="cargo"
        etiqueta="Cargo"
        placeholder="Bodeguero, auxiliar de enfermería, analista de soporte…"
        maxLength={120}
        ayuda="Así lo verán los postulantes."
        error={errores.cargo}
      />

      <div className="campo">
        <label htmlFor="descripcion">Descripción de lo que se hará en el cargo (opcional)</label>
        <textarea
          id="descripcion"
          name="descripcion"
          className={errores.descripcion ? "inp inp-error" : "inp"}
          rows={6}
          maxLength={2000}
          aria-invalid={Boolean(errores.descripcion)}
        />
        {errores.descripcion && <span className="campo-error">{errores.descripcion}</span>}
      </div>

      <p className="texto-gris" style={{ lineHeight: 1.5 }}>
        La IA propone los requisitos según el cargo (con su mínimo interno); después puedes cambiarlos. La vacante se crea
        en borrador: no aparece en el link público hasta que la publiques. Se crean las etapas texto, voz y entrevista, y
        los criterios de la rúbrica.
      </p>

      <div className="flex">
        <BotonEnviar texto="Crear vacante" textoCargando="Creando y pidiendo requisitos a la IA…" cargando={cargando} />
        <Link href="/gestion" className="btn btn-sec">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
