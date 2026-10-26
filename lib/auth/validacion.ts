// Reglas de validación compartidas entre el formulario (navegador) y las Server
// Actions (servidor). El servidor SIEMPRE vuelve a validar: lo del navegador es solo
// para responder rápido al usuario.

export const SECTORES = [
  "Tecnología",
  "Comercio",
  "Servicios",
  "Manufactura e industria",
  "Salud",
  "Educación",
  "Construcción",
  "Logística y transporte",
  "Financiero",
  "Agroindustria",
  "Gobierno y ONG",
  "Otro",
] as const;

export const TAMANOS = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export type CamposRegistro = {
  nombreEmpresa: string;
  nit: string;
  sector: string;
  tamano: string;
  ciudad: string;
  telefono: string;
  sitioWeb: string;
  nombreResponsable: string;
  correo: string;
  clave: string;
  confirmarClave: string;
  aceptaTerminos: string;
};

export type CamposIngreso = { correo: string; clave: string };

export type Errores<T> = Partial<Record<keyof T, string>>;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// bcrypt (Supabase Auth) solo usa los primeros 72 bytes de la contraseña.
export const CLAVE_MIN = 10;
export const CLAVE_MAX = 72;

const CLAVES_COMUNES = new Set([
  "password", "password1", "contraseña", "contrasena", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "admin1234", "iloveyou", "colombia123",
  "empresa123", "bienvenido", "bienvenido1", "11111111", "abc123456", "abcd1234",
]);

export function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

export function limpiarNit(nit: string) {
  return nit.replace(/[\s.]/g, "");
}

// Dígito de verificación de la DIAN para el NIT.
export function digitoVerificacionNit(numero: string): number {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digitos = numero.split("").reverse();
  const suma = digitos.reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

function validarNit(nit: string): string | undefined {
  const limpio = limpiarNit(nit);
  if (!limpio) return "Escribe el NIT de la empresa.";
  const m = /^(\d{6,10})(?:-(\d))?$/.exec(limpio);
  if (!m) return "El NIT debe tener entre 6 y 10 dígitos, con o sin dígito de verificación (900123456-8).";
  if (m[2] !== undefined && digitoVerificacionNit(m[1]) !== Number(m[2])) {
    return "El dígito de verificación no corresponde a este NIT.";
  }
  return undefined;
}

export type FuerzaClave = { nivel: 0 | 1 | 2 | 3 | 4; problemas: string[] };

// Evalúa la contraseña. `contexto` son palabras que no deben aparecer en ella
// (parte del correo, nombre de la empresa).
export function evaluarClave(clave: string, contexto: string[] = []): FuerzaClave {
  const problemas: string[] = [];
  if (clave.length < CLAVE_MIN) problemas.push(`Mínimo ${CLAVE_MIN} caracteres.`);
  if (new TextEncoder().encode(clave).length > CLAVE_MAX) problemas.push(`Máximo ${CLAVE_MAX} caracteres.`);

  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(clave)).length;
  if (tipos < 3) problemas.push("Combina al menos 3 de estos: minúsculas, mayúsculas, números y símbolos.");

  const minus = clave.toLowerCase();
  if (CLAVES_COMUNES.has(minus)) problemas.push("Es una contraseña muy común.");
  if (/(.)\1{3,}/.test(clave)) problemas.push("No repitas el mismo carácter tantas veces.");
  const palabra = contexto
    .map((p) => p.toLowerCase().trim())
    .find((p) => p.length >= 4 && minus.includes(p));
  if (palabra) problemas.push("No uses tu correo ni el nombre de la empresa en la contraseña.");

  let nivel = 0;
  if (clave.length >= CLAVE_MIN) nivel++;
  if (tipos >= 3) nivel++;
  if (clave.length >= 14) nivel++;
  if (tipos === 4 && clave.length >= 12) nivel++;
  if (problemas.length) nivel = Math.min(nivel, 1);
  return { nivel: nivel as FuerzaClave["nivel"], problemas };
}

export function validarRegistro(c: CamposRegistro): Errores<CamposRegistro> {
  const e: Errores<CamposRegistro> = {};
  const nombreEmpresa = c.nombreEmpresa.trim();

  if (!nombreEmpresa) e.nombreEmpresa = "Escribe el nombre de la empresa.";
  else if (nombreEmpresa.length < 2 || nombreEmpresa.length > 120) e.nombreEmpresa = "Entre 2 y 120 caracteres.";

  const errNit = validarNit(c.nit);
  if (errNit) e.nit = errNit;

  if (!c.sector) e.sector = "Elige un sector.";
  else if (!(SECTORES as readonly string[]).includes(c.sector)) e.sector = "Sector no válido.";

  if (!c.tamano) e.tamano = "Elige el tamaño de la empresa.";
  else if (!(TAMANOS as readonly string[]).includes(c.tamano)) e.tamano = "Tamaño no válido.";

  if (!c.ciudad.trim()) e.ciudad = "Escribe la ciudad.";
  else if (c.ciudad.trim().length > 80) e.ciudad = "Máximo 80 caracteres.";

  const tel = c.telefono.replace(/[\s()-]/g, "");
  if (!tel) e.telefono = "Escribe un teléfono de contacto.";
  else if (!/^\+?\d{7,15}$/.test(tel)) e.telefono = "Teléfono no válido (7 a 15 dígitos).";

  if (c.sitioWeb.trim()) {
    try {
      const u = new URL(c.sitioWeb.trim());
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      e.sitioWeb = "Escribe la dirección completa, por ejemplo https://empresa.com";
    }
  }

  if (!c.nombreResponsable.trim()) e.nombreResponsable = "Escribe tu nombre.";
  else if (c.nombreResponsable.trim().length > 100) e.nombreResponsable = "Máximo 100 caracteres.";

  const correo = normalizarCorreo(c.correo);
  if (!correo) e.correo = "Escribe el correo corporativo.";
  else if (!CORREO.test(correo) || correo.length > 254) e.correo = "Correo no válido.";

  if (!c.clave) e.clave = "Crea una contraseña.";
  else {
    const fuerza = evaluarClave(c.clave, [correo.split("@")[0] ?? "", nombreEmpresa]);
    if (fuerza.problemas.length) e.clave = fuerza.problemas[0];
  }

  if (!c.confirmarClave) e.confirmarClave = "Repite la contraseña.";
  else if (c.clave !== c.confirmarClave) e.confirmarClave = "Las contraseñas no coinciden.";

  if (c.aceptaTerminos !== "si") e.aceptaTerminos = "Debes aceptar la política de tratamiento de datos.";

  return e;
}

export function validarIngreso(c: CamposIngreso): Errores<CamposIngreso> {
  const e: Errores<CamposIngreso> = {};
  const correo = normalizarCorreo(c.correo);
  if (!correo) e.correo = "Escribe tu correo.";
  else if (!CORREO.test(correo)) e.correo = "Correo no válido.";
  if (!c.clave) e.clave = "Escribe tu contraseña.";
  return e;
}

const DOMINIOS_PERSONALES = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es",
  "live.com", "yahoo.com", "yahoo.es", "icloud.com", "me.com", "aol.com", "protonmail.com",
  "proton.me", "gmx.com", "mail.com", "zoho.com",
]);

export function esCorreoPersonal(correo: string) {
  const dominio = normalizarCorreo(correo).split("@")[1] ?? "";
  return DOMINIOS_PERSONALES.has(dominio);
}

export function hayErrores(e: object) {
  return Object.keys(e).length > 0;
}
