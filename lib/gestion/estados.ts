// Estado que devuelve la acción de crear vacante al formulario.
export type EstadoVacante =
  | { estado: "inicial" }
  | { estado: "error"; mensaje?: string; errores?: { cargo?: string; descripcion?: string } };

export const vacanteInicial: EstadoVacante = { estado: "inicial" };

// Estado que devuelve la acción de publicar la vacante.
export type EstadoPublicar = { estado: "inicial" } | { estado: "error"; mensaje: string } | { estado: "ok" };

export const publicarInicial: EstadoPublicar = { estado: "inicial" };
