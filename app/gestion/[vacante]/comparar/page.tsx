import Link from "next/link";
import { Barra } from "@/components/barra";
import { CompararPregunta } from "@/components/gestion/comparar-pregunta";
import { leerNumeros, MIN_COMPARAR, perfilesParaComparar } from "@/lib/gestion/comparar-datos";

const REQUISITO: Record<string, string> = { cumple: "Cumple", no_cumple: "No cumple", no_se_sabe: "Sin dato" };

// F · Comparar perfiles (2026-11-19): de 2 a 6 candidatos de esta vacante uno al lado del otro,
// con lo que ya está evaluado (no gasta IA), y debajo una pregunta libre que responde la IA.
// Los números llegan por la URL (?c=014,027); perfilesParaComparar filtra por la empresa.
export default async function Comparar({ params, searchParams }: PageProps<"/gestion/[vacante]/comparar">) {
  const { vacante } = await params;
  const { c } = await searchParams;
  const numeros = leerNumeros(Array.isArray(c) ? c.join(",") : c);
  const perfiles = await perfilesParaComparar(vacante, numeros);
  const volver = `/gestion/${vacante}/postulantes`;

  if (perfiles.length < MIN_COMPARAR) {
    return (
      <section className="bloque">
        <div className="superficie superficie--relleno vacio">
          <h2>Elige al menos dos candidatos</h2>
          <span className="texto-gris">En Postulantes, marca de 2 a 6 casillas y toca «Comparar».</span>
          <Link href={volver} className="btn btn-sec btn-chico">
            Ir a Postulantes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bloque" aria-labelledby="h-comparar">
      <div className="bloque__cabeza">
        <div>
          <nav className="miga" aria-label="Ruta">
            <Link href={volver}>Postulantes</Link>
            <i aria-hidden="true">/</i>
            <span>Comparar</span>
          </nav>
          <h2 id="h-comparar">Comparar {perfiles.length} perfiles</h2>
          <p>Lo que ya evaluó la IA, uno al lado del otro. Abajo puedes preguntar lo que necesites saber. La decisión es tuya.</p>
        </div>
      </div>

      <div className="comparar-tabla" style={{ ["--columnas" as string]: perfiles.length }}>
        {perfiles.map((p) => (
          <article key={p.numero} className="comparar-perfil" aria-labelledby={`perfil-${p.numero}`}>
            <header className="comparar-perfil__cabeza">
              <span className="avatar-num" aria-hidden="true">
                {p.numero}
              </span>
              <div>
                <h3 id={`perfil-${p.numero}`}>
                  <Link href={`/gestion/${vacante}/postulantes/${p.numero}`}>Candidato #{p.numero}</Link>
                </h3>
                <small>{p.etapa}</small>
              </div>
            </header>

            <div className="comparar-perfil__total">
              <b>{p.ajusteTotal ?? "—"}</b>
              <span>{p.ajusteTotal == null ? "Sin evaluar" : "total de 100"}</span>
            </div>

            <div className="comparar-perfil__bloque">
              <span className="etiqueta-sec">Por etapa</span>
              {p.etapas.length === 0 && !p.entrevista && <span className="texto-gris">Sin etapas evaluadas.</span>}
              {p.etapas.map((e) => (
                <div key={e.nombre} className="etapa-puntaje">
                  <div className="etapa-puntaje__fila">
                    <span>{e.nombre}</span>
                    <span className="num">{e.ajuste ?? "—"}</span>
                  </div>
                  <Barra valor={e.ajuste ?? 0} fina />
                </div>
              ))}
              {p.entrevista && (
                <div className="etapa-puntaje">
                  <div className="etapa-puntaje__fila">
                    <span>{p.entrevista.nombre}</span>
                    <span className="num">{p.entrevista.ajuste ?? "—"}</span>
                  </div>
                  <Barra valor={p.entrevista.ajuste ?? 0} fina />
                </div>
              )}
            </div>

            {p.hojaDeVida.length > 0 && (
              <div className="comparar-perfil__bloque">
                <span className="etiqueta-sec">Hoja de vida</span>
                <dl className="comparar-perfil__cv">
                  {p.hojaDeVida.map((d) => (
                    <div key={d.etiqueta}>
                      <dt>{d.etiqueta}</dt>
                      <dd>{d.valor}</dd>
                    </div>
                  ))}
                </dl>
                {p.requisitos.length > 0 && (
                  <span className="texto-gris">
                    Requisitos mínimos: {p.requisitos.filter((q) => q.estado === "cumple").length} de {p.requisitos.length} cumplidos
                    {p.requisitos.some((q) => q.estado !== "cumple") &&
                      ` (${p.requisitos
                        .filter((q) => q.estado !== "cumple")
                        .map((q) => `${q.requisito}: ${REQUISITO[q.estado] ?? q.estado}`)
                        .join("; ")})`}
                  </span>
                )}
              </div>
            )}

            {p.entrevista && (p.entrevista.fortalezas.length > 0 || p.entrevista.debilidades.length > 0) && (
              <div className="comparar-perfil__bloque">
                <span className="etiqueta-sec">En la entrevista</span>
                <ul className="comparar-perfil__lista">
                  {p.entrevista.fortalezas.slice(0, 3).map((f) => (
                    <li key={f} data-tipo="mas">
                      {f}
                    </li>
                  ))}
                  {p.entrevista.debilidades.slice(0, 3).map((f) => (
                    <li key={f} data-tipo="menos">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.etapas.some((e) => e.fortalezas || e.profundizar) && (
              <div className="comparar-perfil__bloque">
                <span className="etiqueta-sec">En las preguntas</span>
                <ul className="comparar-perfil__lista">
                  {p.etapas.map((e) => e.fortalezas && <li key={`f-${e.nombre}`} data-tipo="mas">{e.fortalezas}</li>)}
                  {p.etapas.map((e) => e.profundizar && <li key={`p-${e.nombre}`} data-tipo="duda">{e.profundizar}</li>)}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>

      <CompararPregunta vacanteId={vacante} numeros={perfiles.map((p) => p.numero)} />
    </section>
  );
}
