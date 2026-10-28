"use client";

import { useState, useTransition } from "react";
import { redactarDescripcion } from "@/lib/gestion/ia";
import { guardarDescripcion } from "@/lib/gestion/vacantes";

// Descripción pública de la vacante. La IA solo propone un borrador en el cuadro:
// no se guarda hasta que la empresa lo revisa y pulsa "Guardar descripción".
export function DescripcionEditor({ vacanteId, cargo, descripcion }: { vacanteId: string; cargo: string; descripcion: string }) {
  const [texto, setTexto] = useState(descripcion);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, iniciarGuardar] = useTransition();
  const [redactando, iniciarRedactar] = useTransition();
  const cambiado = texto.trim() !== descripcion.trim();

  function redactar() {
    setAviso(null);
    iniciarRedactar(async () => {
      const r = await redactarDescripcion(cargo, texto);
      if (r.ok) {
        setTexto(r.texto);
        setAviso({ ok: true, texto: "Borrador de la IA listo. Revísalo, ajústalo y guarda." });
      } else setAviso({ ok: false, texto: r.mensaje });
    });
  }

  function guardar() {
    setAviso(null);
    iniciarGuardar(async () => {
      const r = await guardarDescripcion(vacanteId, texto);
      setAviso({ ok: r.ok, texto: r.mensaje });
    });
  }

  return (
    <>
      <div className="campo">
        <label htmlFor="descripcion-vacante">Descripción que ven los postulantes</label>
        <textarea
          id="descripcion-vacante"
          className="area"
          rows={6}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={guardando || redactando}
        />
        <span className="texto-gris" style={{ fontSize: 12 }}>
          {texto.length} / 2000 · No escribas aquí los mínimos internos: esos van en los requisitos.
        </span>
      </div>
      {aviso && (
        <div className={aviso.ok ? "nota nota-az" : "nota nota-error"} role="status">
          {aviso.texto}
        </div>
      )}
      <div className="flex">
        <button type="button" className="btn btn-chico" disabled={!cambiado || guardando || redactando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar descripción"}
        </button>
        <button type="button" className="btn btn-sec btn-chico" disabled={guardando || redactando} onClick={redactar}>
          {redactando ? "Redactando…" : texto.trim() ? "Mejorar con IA" : "Redactar con IA"}
        </button>
      </div>
    </>
  );
}
