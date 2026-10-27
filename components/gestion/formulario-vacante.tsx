"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { BotonEnviar } from "@/components/auth/boton-enviar";
import { Campo } from "@/components/auth/campo";
import { type RequisitoSugerido, sugerirRequisitos } from "@/lib/gestion/ia";
import { crearVacante } from "@/lib/gestion/vacantes";
import { vacanteInicial } from "@/lib/gestion/estados";

export function FormularioVacante() {
  const [estado, accion, cargando] = useActionState(crearVacante, vacanteInicial);
  const [consultando, empezarConsulta] = useTransition();
  const [sugeridos, setSugeridos] = useState<RequisitoSugerido[] | null>(null);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const errores = estado.estado === "error" ? estado.errores ?? {} : {};
  const mensaje = estado.estado === "error" ? estado.mensaje : undefined;

  // Solo consulta: muestra los requisitos sugeridos y no guarda nada.
  function consultar() {
    const datos = new FormData(formRef.current ?? undefined);
    empezarConsulta(async () => {
      const r = await sugerirRequisitos(String(datos.get("cargo") ?? ""), String(datos.get("descripcion") ?? ""));
      setErrorIa(r.ok ? null : r.mensaje);
      setSugeridos(r.ok ? r.requisitos : null);
    });
  }

  return (
    <form ref={formRef} action={accion} noValidate className="auth-form">
      {mensaje && (
        <div className="nota nota-error" role="alert">
          {mensaje}
        </div>
      )}

      <Campo
        nombre="cargo"
        etiqueta="Cargo"
        placeholder="Analista de soporte"
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

      <div className="flex">
        <button type="button" className="btn btn-sec btn-chico" disabled={consultando} onClick={consultar}>
          {consultando ? "Consultando…" : "Consultar requisitos con IA"}
        </button>
      </div>
      {errorIa && (
        <div className="nota nota-error" role="alert">
          {errorIa}
        </div>
      )}
      {sugeridos && (
        <div className="tarjeta" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 14 }}>Requisitos que se pueden pedir para esta vacante</b>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {sugeridos.map((r) => (
              <li key={r.nombre}>
                <b>{r.nombre}:</b> <span className="texto-gris">{r.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="texto-gris" style={{ lineHeight: 1.5 }}>
        La vacante se crea en borrador: no aparece en el link público hasta que la publiques. Se crean las etapas texto,
        voz y entrevista, y los requisitos y criterios por defecto.
      </p>

      <div className="flex">
        <BotonEnviar texto="Crear vacante" textoCargando="Creando…" cargando={cargando} />
        <Link href="/gestion" className="btn btn-sec">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
