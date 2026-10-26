import { etapas, requisitos, sugeridos } from "@/lib/datos-prueba";

// B · Requisitos y etapas. Cada requisito tiene valor de la oferta (público) y mínimo (interno).
export default function Requisitos() {
  return (
    <>
      <section className="tarjeta">
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Requisitos de la vacante</h2>
          <span className="texto-gris" style={{ lineHeight: 1.45 }}>
            Para cada requisito, escribe lo que pide la oferta y lo mínimo que aceptarías. El mínimo es interno: no lo ve el postulante.
          </span>
        </div>
        <div className="tabla-caja">
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Requisito</th>
                <th>Lo que pide la oferta (público)</th>
                <th>Mínimo aceptable (interno)</th>
              </tr>
            </thead>
            <tbody>
              {requisitos.map((r) => (
                <tr key={r.nombre}>
                  <td>
                    <b>{r.nombre}</b>
                  </td>
                  <td>
                    <input className="inp" defaultValue={r.oferta} aria-label={`Oferta: ${r.nombre}`} />
                  </td>
                  <td>
                    <input className="inp inp-resaltado" defaultValue={r.minimo} aria-label={`Mínimo: ${r.nombre}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 14 }}>Sugeridos para filtrar más rápido</b>
          <div className="flex">
            {sugeridos.map((s) => (
              <span key={s} className="pill">
                + {s}
              </span>
            ))}
            <span className="pill punto">+ Requisito personalizado</span>
          </div>
          <div className="nota nota-az">
            La IA lee el CV y aplica estos mínimos. Si no logra leer un dato, el CV pasa a &quot;Por revisar&quot; en vez de descartarse. La app no permite requisitos discriminatorios (edad máxima, género, estado civil).
          </div>
        </div>
      </section>

      <section className="tarjeta">
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Etapas del proceso</h2>
            <span className="texto-gris">La empresa decide cuántas etapas tiene esta vacante y en qué orden.</span>
          </div>
          <button type="button" className="btn btn-punto">
            + Agregar etapa
          </button>
        </div>
        <div className="flex" style={{ gap: 10 }}>
          {etapas.map((e, i) => (
            <div key={e.titulo} className="paso">
              <b>{i + 1}</b>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.titulo}</div>
                <div className="texto-gris" style={{ fontSize: 12 }}>
                  {e.detalle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn">
          Guardar requisitos
        </button>
      </div>
    </>
  );
}
