// "17 nov. 2026" en hora de Colombia, igual en el servidor y en el navegador.
const formato = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

export const fechaCorta = (iso: string) => formato.format(new Date(iso));
