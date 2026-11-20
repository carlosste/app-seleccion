"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { Barra } from "@/components/barra";
import { Estado } from "@/components/estado";
import type { PostulanteFila } from "@/lib/gestion/datos";

// Lista de postulantes con:
// - filtro por etapa (2026-11-19, Carlos): "Etapa N · nombre", con cuántos están hoy en cada una,
//   más Seleccionados y Descartados. Se guarda en la URL (?etapa=) para que la barra lateral
//   pueda abrir la lista ya filtrada;
// - buscador por número de candidato ("014", "14" o "#014");
// - casillas para comparar de 2 a 6 perfiles (/gestion/[vacante]/comparar).
// Todo filtra en el navegador lo que ya llegó del servidor: no hace consultas nuevas.

export const MAX_COMPARAR = 6;

function coincide(numero: string, busqueda: string) {
  const digitos = busqueda.replace(/\D/g, "");
  if (!digitos) return true;
  return numero.includes(digitos) || Number(numero) === Number(digitos);
}

type EtapaFiltro = { id: string; nombre: string };

export function ListaPostulantes({
  vacanteId,
  postulantes,
  etapas,
}: {
  vacanteId: string;
  postulantes: PostulanteFila[];
  etapas: EtapaFiltro[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const filtro = parametros.get("etapa") ?? "todos";
  const [busqueda, setBusqueda] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const idCampo = useId();

  const enFiltro = (p: PostulanteFila) => {
    if (filtro === "todos") return true;
    if (filtro === "seleccionados") return p.decision === "pasa";
    if (filtro === "descartados") return p.decision === "no";
    // En una etapa: solo los que siguen en proceso y están ahí ahora.
    return p.decision === "pendiente" && p.etapaId === filtro;
  };

  const opciones = [
    { valor: "todos", texto: "Todos", cuenta: postulantes.length },
    ...etapas.map((e) => ({
      valor: e.id,
      texto: e.nombre,
      cuenta: postulantes.filter((p) => p.decision === "pendiente" && p.etapaId === e.id).length,
    })),
    { valor: "seleccionados", texto: "Seleccionados", cuenta: postulantes.filter((p) => p.decision === "pasa").length },
    { valor: "descartados", texto: "Descartados", cuenta: postulantes.filter((p) => p.decision === "no").length },
  ];
  const activo = opciones.find((o) => o.valor === filtro) ?? opciones[0];

  const delFiltro = postulantes.filter(enFiltro);
  const visibles = delFiltro.filter((p) => coincide(p.numero, busqueda));
  const buscando = busqueda.replace(/\D/g, "") !== "";

  function elegirFiltro(valor: string) {
    const nuevos = new URLSearchParams(parametros);
    if (valor === "todos") nuevos.delete("etapa");
    else nuevos.set("etapa", valor);
    const q = nuevos.toString();
    router.replace(q ? `${ruta}?${q}` : ruta, { scroll: false });
  }

  function alternar(numero: string) {
    setElegidos((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : prev.length >= MAX_COMPARAR ? prev : [...prev, numero],
    );
  }

  return (
    <>
      <div className="filtro-etapas" role="group" aria-label="Filtrar por etapa">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            className="filtro-etapas__chip"
            aria-pressed={activo.valor === o.valor}
            onClick={() => elegirFiltro(o.valor)}
          >
            <span>{o.texto}</span>
            <em>{o.cuenta.toLocaleString("es-CO")}</em>
          </button>
        ))}
      </div>

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
          {buscando ? `${visibles.length} de ${delFiltro.length}` : `${delFiltro.length} en «${activo.texto}»`}
        </span>
      </div>

      {/* Barra de comparación: aparece al marcar el primero; compara de 2 a 6. */}
      {elegidos.length > 0 && (
        <div className="barra-comparar" role="region" aria-label="Comparar perfiles">
          <span>
            <b>{elegidos.length}</b> de {MAX_COMPARAR} marcados: {elegidos.map((n) => `#${n}`).join(", ")}
          </span>
          <div className="flex">
            <button type="button" className="btn-enlace" onClick={() => setElegidos([])}>
              Quitar marcas
            </button>
            {elegidos.length >= 2 ? (
              <Link href={`/gestion/${vacanteId}/comparar?c=${elegidos.join(",")}`} className="btn btn-chico">
                Comparar {elegidos.length} perfiles
              </Link>
            ) : (
              <span className="texto-gris">Marca al menos otro para comparar</span>
            )}
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>{buscando ? "Ningún candidato con ese número" : "Nadie en esta etapa por ahora"}</h2>
          <span className="texto-gris">
            {buscando ? "Revisa el número o borra la búsqueda." : "Elige otra etapa o «Todos» para ver a los demás."}
          </span>
        </div>
      ) : (
        <div className="superficie lista-postulantes">
          <div className="lista-filas__cabeza" aria-hidden="true">
            <span />
            <span className="cabeza__doble">Candidato</span>
            <span>Etapa</span>
            <span>Ajuste al cargo (IA)</span>
            <span>Decisión</span>
            <span />
          </div>
          <ul className="lista-filas">
            {visibles.map((p) => {
              const marcado = elegidos.includes(p.numero);
              return (
                <li key={p.id} className="fila-con-casilla">
                  <label className="fila__casilla">
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && elegidos.length >= MAX_COMPARAR}
                      onChange={() => alternar(p.numero)}
                    />
                    <span className="sr-solo">Marcar al candidato #{p.numero} para comparar</span>
                  </label>
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
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
