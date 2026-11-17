"use client";

import { useState } from "react";
import Link from "next/link";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import type { PostulanteFila } from "@/lib/gestion/datos";

// "014", "14" o "#14" encuentran al Candidato #014.
function coincide(numero: string, busqueda: string) {
  const digitos = busqueda.replace(/\D/g, "");
  if (!digitos) return true;
  return numero.includes(digitos) || Number(numero) === Number(digitos);
}

// Tabla de postulantes con buscador por número de candidato (se filtra en el navegador).
export function ListaPostulantes({ vacanteId, postulantes }: { vacanteId: string; postulantes: PostulanteFila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = postulantes.filter((p) => coincide(p.numero, busqueda));
  const buscando = busqueda.replace(/\D/g, "") !== "";

  return (
    <>
      <div className="buscador-postulantes">
        <label htmlFor="buscar-candidato">Buscar candidato por número</label>
        <div className="buscador-postulantes__campo">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="buscar-candidato"
            className="inp"
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej.: 014"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <span className="texto-gris" aria-live="polite">
          {buscando ? `${visibles.length} de ${postulantes.length}` : `${postulantes.length} postulantes`}
        </span>
      </div>

      {visibles.length === 0 ? (
        <div className="tarjeta vacio">
          <h2 style={{ fontSize: 18 }}>Ningún candidato con ese número</h2>
          <span className="texto-gris">Revisa el número o borra la búsqueda para ver a todos.</span>
        </div>
      ) : (
        <div className="tarjeta tabla-caja" style={{ padding: 0 }}>
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Postulante</th>
                <th>Etapa</th>
                <th style={{ width: 260 }}>Ajuste al cargo (IA)</th>
                <th>Decisión</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>Candidato #{p.numero}</b>
                  </td>
                  <td>{p.etapa}</td>
                  <td>
                    {p.ajuste == null ? (
                      <span className="texto-gris">Sin evaluar</span>
                    ) : (
                      <div className="celda-ajuste">
                        <Barra valor={p.ajuste} />
                        <span className="num">{p.ajuste}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <Estado decision={p.decision} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/gestion/${vacanteId}/postulantes/${p.numero}`} style={{ fontWeight: 600 }}>
                      Ver respuestas
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
