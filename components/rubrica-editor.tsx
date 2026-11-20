"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { agregarCriterio, cambiarPesoCriterio, guardarCriterio, quitarCriterio } from "@/lib/gestion/acciones-configuracion";
import { Barra } from "@/components/barra";
import type { CriterioVacante } from "@/lib/gestion/configuracion";

type Resultado = { ok: boolean; mensaje?: string };

const MAXIMO_CRITERIOS = 20;

// Rúbrica editable. Cambiar un peso reparte la diferencia entre los demás criterios
// para que el total siga en 100 (lo hace el servidor con `repartir`). Hasta 20 criterios.
// Cada criterio es una tarjeta con etiquetas visibles; el peso se cambia escribiendo el número.
export function RubricaEditor({ vacanteId, criterios }: { vacanteId: string; criterios: CriterioVacante[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<"" | "guardando" | "guardado">("");
  const total = criterios.reduce((suma, c) => suma + c.peso, 0);
  const lleno = criterios.length >= MAXIMO_CRITERIOS;

  function ejecutar(accion: () => Promise<Resultado>) {
    setEstado("guardando");
    empezar(async () => {
      const r = await accion();
      setAviso(r.ok ? null : (r.mensaje ?? "No pudimos guardar el cambio."));
      setEstado(r.ok ? "guardado" : "");
      router.refresh();
    });
  }

  return (
    <div className="rubrica">
      {aviso && (
        <div className="nota nota-error" role="alert">
          {aviso}
        </div>
      )}

      {criterios.length === 0 ? (
        <div className="rubrica__vacia">
          <b>Todavía no hay criterios</b>
          <span>Agrega al menos uno para que la IA pueda calificar las respuestas.</span>
        </div>
      ) : (
        <ol className="rubrica__lista">
          {criterios.map((c, i) => (
            <FilaCriterio
              key={c.id}
              numero={i + 1}
              criterio={c}
              unico={criterios.length === 1}
              deshabilitado={pendiente}
              onGuardar={(nombre, descripcion) => ejecutar(() => guardarCriterio(c.id, vacanteId, nombre, descripcion))}
              onPeso={(peso) => ejecutar(() => cambiarPesoCriterio(c.id, vacanteId, peso))}
              onQuitar={() => ejecutar(() => quitarCriterio(c.id, vacanteId))}
            />
          ))}
        </ol>
      )}

      <div className="rubrica__pie">
        <button
          type="button"
          className="btn btn-punto"
          disabled={pendiente || lleno}
          onClick={() => ejecutar(() => agregarCriterio(vacanteId, "Nuevo criterio", ""))}
        >
          + Agregar criterio
        </button>
        <div className="rubrica__total">
          <span className={total === 100 || criterios.length === 0 ? "chip-estado chip-estado--ok" : "chip-estado chip-estado--revisar"}>
            Total {total} %
          </span>
          <small>
            {criterios.length} de {MAXIMO_CRITERIOS} criterios
          </small>
        </div>
      </div>

      {/* Avisa al lector de pantalla cuándo se guardó, sin mover el foco. */}
      <p className="rubrica__estado" role="status" aria-live="polite">
        {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "Cambios guardados" : ""}
      </p>
    </div>
  );
}

function FilaCriterio({
  numero,
  criterio,
  unico,
  deshabilitado,
  onGuardar,
  onPeso,
  onQuitar,
}: {
  numero: number;
  criterio: CriterioVacante;
  unico: boolean;
  deshabilitado: boolean;
  onGuardar: (nombre: string, descripcion: string) => void;
  onPeso: (peso: number) => void;
  onQuitar: () => void;
}) {
  const id = useId();
  const [nombre, setNombre] = useState(criterio.nombre);
  const [descripcion, setDescripcion] = useState(criterio.descripcion);
  const [peso, setPeso] = useState(String(criterio.peso));
  const [confirmando, setConfirmando] = useState(false);

  // Si otro cambio reparte los pesos, el campo muestra el valor nuevo.
  useEffect(() => setPeso(String(criterio.peso)), [criterio.peso]);

  // Un peso inválido no se envía: el campo vuelve al valor guardado.
  function confirmarPeso() {
    const valor = Number(peso);
    if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
      setPeso(String(criterio.peso));
      return;
    }
    if (valor !== criterio.peso) onPeso(valor);
  }

  function guardarTexto() {
    if (nombre.trim() !== criterio.nombre || descripcion.trim() !== criterio.descripcion) onGuardar(nombre, descripcion);
  }

  return (
    <li className="crit">
      <div className="crit__cabeza">
        <span className="crit__num" aria-hidden="true">
          {numero}
        </span>
        <div className="crit__campo crit__campo--nombre">
          <label htmlFor={`${id}-nombre`}>Criterio</label>
          <input
            id={`${id}-nombre`}
            className="inp"
            value={nombre}
            maxLength={80}
            disabled={deshabilitado}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardarTexto}
          />
        </div>
      </div>

      <div className="crit__campo">
        <label htmlFor={`${id}-desc`}>Qué debe mostrar el postulante</label>
        <textarea
          id={`${id}-desc`}
          className="area crit__desc"
          value={descripcion}
          maxLength={300}
          rows={2}
          placeholder="Ej.: explica los pasos que siguió y por qué los eligió"
          disabled={deshabilitado}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={guardarTexto}
        />
      </div>

      <div className="crit__peso">
        <div className="crit__peso-texto">
          <span id={`${id}-peso-et`}>Importancia</span>
          <small>
            Vale {criterio.peso} de cada 100 puntos del ajuste
          </small>
        </div>
        <div className="paso">
          <span className="paso__valor">
            <input
              className="peso"
              value={peso}
              inputMode="numeric"
              aria-label={`Importancia de ${criterio.nombre}, en porcentaje`}
              disabled={deshabilitado || unico}
              onChange={(e) => setPeso(e.target.value)}
              onBlur={confirmarPeso}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <span aria-hidden="true">%</span>
          </span>
        </div>
        <div className="crit-barra">
          <Barra valor={criterio.peso} fina />
        </div>
      </div>

      <div className="crit__quitar">
        {confirmando ? (
          <div className="crit__confirmar" role="group" aria-label={`Confirmar quitar ${criterio.nombre}`}>
            <span>¿Quitar este criterio? Su peso pasa a los demás.</span>
            <button type="button" className="btn btn-sec btn-chico" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-chico" autoFocus disabled={deshabilitado} onClick={onQuitar}>
              Sí, quitar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-enlace crit__quitar-btn"
            disabled={deshabilitado}
            aria-label={`Quitar el criterio ${criterio.nombre}`}
            onClick={() => setConfirmando(true)}
          >
            Quitar criterio
          </button>
        )}
      </div>
    </li>
  );
}
