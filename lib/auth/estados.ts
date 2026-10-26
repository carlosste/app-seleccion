import type { CamposIngreso, CamposRegistro, Errores } from "./validacion";

// Estados que devuelven las Server Actions a los formularios.
export type EstadoRegistro =
  | { estado: "inicial" }
  | { estado: "error"; mensaje?: string; errores?: Errores<CamposRegistro> }
  | { estado: "ok"; correo: string; aviso?: string };

export type EstadoIngreso =
  | { estado: "inicial" }
  | { estado: "error"; mensaje?: string; errores?: Errores<CamposIngreso> }
  | { estado: "aviso"; mensaje: string };

export const registroInicial: EstadoRegistro = { estado: "inicial" };
export const ingresoInicial: EstadoIngreso = { estado: "inicial" };
