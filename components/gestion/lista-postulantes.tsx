"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import type { PostulanteFila } from "@/lib/gestion/datos";

// Lista de postulantes con buscador por número de candidato ("014", "14" o "#014").
// Filtra en el navegador lo que ya llegó del servidor: no hace consultas nuevas.
function coincide(numero: string, busqueda: string) {
  const digitos = busqueda.replace(/\D/g, "");
  if (!digitos) return true;
  return numero.includes(digitos) || Number(numero) === Number(digitos);
}

export function ListaPostulantes({ vacanteId, postulantes }: { vacanteId: string; postulantes: PostulanteFila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const idCampo = useId();
  const visibles = postulantes.filter((p) => coincide(p.numero, busqueda));
  const buscando = busqueda.replace(/\D/g, "") !== "";

  return (
    <>
      <div className="buscador-postulantes" role="search">
        <label htmlFor={idCampo} className="buscador-postulantes__etiqueta">
          Buscar candidato por número
        </label>
        <div className="buscador-postulantes__campo">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id={idCampo}
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej.: 014"
            className="inp"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <span className="texto-gris" aria-live="polite">
          {buscando ? `${visibles.length} de ${postulantes.length}` : `${postulantes.length} postulantes`}
        </span>
      </div>

      {visibles.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>Ningún candidato con ese número</h2>
          <span className="texto-gris">Revisa el número o borra la búsqueda para ver a todos.</span>
        </div>
      ) : (
        <div className="superficie lista-postulantes">
          <div className="lista-filas__cabeza" aria-hidden="true">
            <span />
            <span>Candidato</span>
            <span>Etapa</span>
            <span>Ajuste al cargo (IA)</span>
            <span>Decisión</span>
            <span />
          </div>
          <ul className="lista-filas">
            {visibles.map((p) => (
              <li key={p.id}>
                <Link href={`/gestion/${vacanteId}/postulantes/${p.numero}`} className="fila">
                  <span className="avatar-num" aria-hidden="true">
                    {p.numero}
                  </span>
                  <span className="fila__principal">
                    <b>Candidato #{p.numero}</b>
                    {p.sospecha ? (
                      <span className="fila__alerta" title="La IA o el servidor vieron un posible intento de manipular la evaluación">
                        Revisar a mano: posible manipulación
                      </span>
                    ) : (
                      <small>Ver respuestas y evidencia</small>
                    )}
                  </span>
                  <span className="fila__etapa">{p.etapa}</span>
                  <span className="fila__ajuste">
                    {p.ajuste == null ? (
                      <span className="texto-gris">Sin evaluar</span>
                    ) : (
                      <>
                        <span className="num">{p.ajuste}</span>
                        <Barra valor={p.ajuste} fina />
                      </>
                    )}
                  </span>
                  <span className="fila__chip">
                    <Estado decision={p.decision} />
                  </span>
                  <svg className="fila__flecha" viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                    <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
