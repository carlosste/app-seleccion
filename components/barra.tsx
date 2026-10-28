// Decorativa: el número va siempre al lado en texto, así que el lector de pantalla la salta.
export function Barra({ valor, fina = false }: { valor: number; fina?: boolean }) {
  return (
    <div className={fina ? "barra barra-fina" : "barra"} aria-hidden="true">
      <div style={{ width: `${valor}%` }} />
    </div>
  );
}
