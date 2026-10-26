export function Barra({ valor, fina = false }: { valor: number; fina?: boolean }) {
  return (
    <div className={fina ? "barra barra-fina" : "barra"}>
      <div style={{ width: `${valor}%` }} />
    </div>
  );
}
