// Tratamiento de datos personales (Colombia): Ley 1581 de 2012 y Decreto 1377 de 2013, hoy
// compilado en el Decreto 1074 de 2015. Un solo lugar para el texto del consentimiento y de la
// política (/privacidad). Si el texto cambia, sube VERSION_TEXTO: cada consentimiento guarda la
// versión que aceptó la persona.
//
// Quién es quién:
// - Responsable del tratamiento: la empresa que publica la vacante (decide para qué se usan los
//   datos: su proceso de selección). Su nombre sale de la vacante.
// - Encargado: el operador de esta plataforma, que guarda y procesa los datos por cuenta de la
//   empresa y atiende las solicitudes de los titulares.
// - Subencargados fuera de Colombia (transmisión internacional): Supabase (base de datos y
//   archivos, Estados Unidos), Vercel (servidores de la aplicación) y Google (Gemini, análisis
//   con IA).
//
// PENDIENTE (los define Carlos, no se inventan): los datos del operador. Mientras falten, la página
// muestra el aviso "por definir" y la app solo debe usarse con datos ficticios.

export const VERSION_TEXTO = "v2";
export const VIGENTE_DESDE = "16 de noviembre de 2026";

const PENDIENTE = null;
export const OPERADOR: {
  nombre: string | null;
  identificacion: string | null; // NIT o cédula
  domicilio: string | null; // ciudad y dirección
  correo: string | null; // canal para consultas y reclamos
  telefono: string | null;
} = {
  nombre: PENDIENTE,
  identificacion: PENDIENTE,
  domicilio: PENDIENTE,
  correo: PENDIENTE,
  telefono: PENDIENTE,
};

// Cuánto tiempo se guardan los datos. PENDIENTE: la retención automática es de la versión de pago
// (CLAUDE.md). Mientras tanto se informa la regla general de la ley: lo necesario para la finalidad.
export const CONSERVACION =
  "Durante el proceso de selección y el tiempo adicional que la empresa necesite para atender " +
  "reclamos o cumplir obligaciones legales. Después se suprimen, salvo que la ley exija conservarlos.";

export const MODO_PRUEBAS =
  "Esta plataforma está en modo de pruebas. Por ahora el análisis con IA usa el plan gratuito de la " +
  "API de Gemini, en el que Google puede usar el contenido enviado para mejorar sus productos, con " +
  "revisión humana. Por eso, mientras dure este modo, solo deben usarse datos ficticios de prueba.";

// Texto corto de cada casilla del formulario. Debe coincidir con lo que dice /privacidad.
export const CASILLA_DATOS =
  "Autorizo de forma previa, expresa e informada el tratamiento de mis datos personales (nombre, " +
  "documento, correo, teléfono, hoja de vida y respuestas) para el proceso de selección de esta " +
  "vacante, incluido su análisis con inteligencia artificial y su envío a proveedores fuera de " +
  "Colombia, según la política de tratamiento de datos.";
export const CASILLA_GRABACION =
  "Autorizo que se graben y transcriban mis respuestas por voz y la entrevista, solo para evaluarlas " +
  "en este proceso. Puedo pedir responder por escrito sin explicar el motivo.";
