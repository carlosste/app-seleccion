export type Peso = { id: string; peso: number };

// Reparte los pesos para que sumen 100. Si se indica `fijado`, ese criterio conserva
// su peso (acotado para que los demás tengan al menos 1) y el resto se escala en
// proporción a su peso anterior. Sin `fijado`, todos se escalan a 100.
export function repartir(items: Peso[], fijado?: Peso): Peso[] {
  const otros = items.filter((i) => i.id !== fijado?.id);
  if (otros.length === 0) return fijado ? [{ id: fijado.id, peso: 100 }] : [];

  const pesoFijado = fijado ? Math.min(Math.max(fijado.peso, 1), 100 - otros.length) : 0;
  const resto = 100 - pesoFijado;
  const suma = otros.reduce((acc, o) => acc + o.peso, 0);
  const exactos = otros.map((o) => (suma > 0 ? (o.peso * resto) / suma : resto / otros.length));

  // Cada uno recibe la parte entera (mínimo 1). Lo que sobra o sobra de más se
  // ajusta con las partes decimales más grandes.
  const base = exactos.map((x) => Math.max(1, Math.floor(x)));
  let diferencia = resto - base.reduce((acc, b) => acc + b, 0);
  while (diferencia < 0) {
    const mayor = base.indexOf(Math.max(...base));
    base[mayor]--;
    diferencia++;
  }
  const porDecimal = exactos.map((x, i) => ({ i, decimal: x - Math.floor(x) })).sort((a, b) => b.decimal - a.decimal);
  for (let k = 0; diferencia > 0; k++) {
    base[porDecimal[k % porDecimal.length].i]++;
    diferencia--;
  }

  return items.map((item) => {
    if (fijado && item.id === fijado.id) return { id: item.id, peso: pesoFijado };
    const posicion = otros.findIndex((o) => o.id === item.id);
    return { id: item.id, peso: base[posicion] };
  });
}
