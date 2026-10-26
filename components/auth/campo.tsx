"use client";

import { useId, useState } from "react";

type Props = {
  nombre: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  tipo?: string;
  autoComplete?: string;
  placeholder?: string;
  opcional?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  onBlur?: (valor: string) => void;
  onChange?: (valor: string) => void;
};

// Campo de texto con etiqueta, error accesible (aria-describedby) y, para
// contraseñas, botón de mostrar/ocultar.
export function Campo({ nombre, etiqueta, error, ayuda, tipo = "text", opcional, onBlur, onChange, ...resto }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const esClave = tipo === "password";
  const descripcion = [error && `${id}-error`, ayuda && `${id}-ayuda`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="campo">
      <label htmlFor={id}>
        {etiqueta} {opcional && <span className="texto-gris">(opcional)</span>}
      </label>
      <div className={esClave ? "inp-clave" : undefined}>
        <input
          id={id}
          name={nombre}
          type={esClave && visible ? "text" : tipo}
          className={error ? "inp inp-error" : "inp"}
          aria-invalid={Boolean(error)}
          aria-describedby={descripcion}
          onBlur={onBlur ? (e) => onBlur(e.currentTarget.value) : undefined}
          onChange={onChange ? (e) => onChange(e.currentTarget.value) : undefined}
          {...resto}
        />
        {esClave && (
          <button
            type="button"
            className="ver-clave"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>
      {ayuda && !error && (
        <span id={`${id}-ayuda`} className="campo-ayuda">
          {ayuda}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="campo-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function Selector({
  nombre,
  etiqueta,
  opciones,
  error,
  onChange,
}: {
  nombre: string;
  etiqueta: string;
  opciones: readonly string[];
  error?: string;
  onChange?: (valor: string) => void;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select
        id={id}
        name={nombre}
        defaultValue=""
        className={error ? "inp inp-error" : "inp"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={onChange ? (e) => onChange(e.currentTarget.value) : undefined}
      >
        <option value="" disabled>
          Elige una opción
        </option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${id}-error`} className="campo-error">
          {error}
        </span>
      )}
    </div>
  );
}
