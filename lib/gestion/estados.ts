// Estado que devuelve la acción de crear vacante al formulario.
export type EstadoVacante =
  | { estado: "inicial" }
  | { estado: "error"; mensaje?: string; errores?: { cargo?: string; descripcion?: string } };

export const vacanteInicial: EstadoVacante = { estado: "inicial" };
