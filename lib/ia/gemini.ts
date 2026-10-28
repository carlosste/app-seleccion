import "server-only";

// Llamada a Gemini solo desde el servidor. La clave nunca sale al navegador.
// Si un modelo está saturado, se pasa al siguiente. Todos son del plan gratuito.
const MODELOS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
const INTENTOS_POR_MODELO = 2;
// Por intento. Vercel corta la función si tarda demasiado: mejor fallar con un mensaje claro.
const TIEMPO_LIMITE_MS = 15_000;
// Leer un PDF tarda más (unos 13-14 s en las pruebas del 2026-10-28).
const TIEMPO_LIMITE_ADJUNTOS_MS = 40_000;
// Errores pasajeros de Google. Un 400 o 403 (clave o petición mal hecha) no se arregla reintentando.
const REINTENTABLES = [429, 500, 503, 504];

// Archivo que acompaña los datos (por ejemplo el CV en PDF), en base64.
export type Adjunto = { mimeType: string; data: string };

const REGLAS =
  "Responde solo con JSON válido, en español. Nunca propongas requisitos ni preguntas sobre edad máxima, " +
  "género, estado civil, acento, tono de voz ni rasgos personales. La edad mínima sí puede pedirse.";

class ErrorGemini extends Error {
  constructor(mensaje: string, readonly reintentable: boolean) {
    super(mensaje);
  }
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function llamar(modelo: string, clave: string, cuerpo: string, limiteMs: number): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
      body: cuerpo,
      signal: AbortSignal.timeout(limiteMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ErrorGemini(`Gemini (${modelo}) no respondió en ${limiteMs / 1000} s`, true);
    }
    throw error;
  }
  if (!respuesta.ok) {
    throw new ErrorGemini(`Gemini (${modelo}) respondió ${respuesta.status}`, REINTENTABLES.includes(respuesta.status));
  }

  const json = await respuesta.json();
  const texto: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    const motivo = json.candidates?.[0]?.finishReason ?? "desconocido";
    throw new ErrorGemini(`Gemini (${modelo}) no devolvió texto (motivo: ${motivo})`, false);
  }
  return texto;
}

// Igual que pedirJson, pero dice qué modelo respondió (se guarda en evaluaciones_ia.modelo).
export async function pedirJsonConModelo<T>(
  instruccion: string,
  datos: string,
  adjuntos: Adjunto[] = [],
): Promise<{ datos: T; modelo: string }> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) throw new Error("Falta GEMINI_API_KEY en el servidor");

  const cuerpo = JSON.stringify({
    systemInstruction: { parts: [{ text: `${REGLAS}\n${instruccion}` }] },
    contents: [{ role: "user", parts: [...adjuntos.map((a) => ({ inlineData: a })), { text: datos }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });
  const limiteMs = adjuntos.length ? TIEMPO_LIMITE_ADJUNTOS_MS : TIEMPO_LIMITE_MS;

  let ultimoError: unknown;
  for (const modelo of MODELOS) {
    for (let intento = 1; intento <= INTENTOS_POR_MODELO; intento++) {
      let texto: string;
      try {
        texto = await llamar(modelo, clave, cuerpo, limiteMs);
      } catch (error) {
        if (!(error instanceof ErrorGemini) || !error.reintentable) throw error;
        ultimoError = error;
        console.warn(`[ia] ${error.message} (intento ${intento})`);
        // Espera corta antes de reintentar el mismo modelo; al cambiar de modelo no se espera.
        if (intento < INTENTOS_POR_MODELO) await esperar(1000 * intento);
        continue;
      }
      try {
        return { datos: JSON.parse(texto) as T, modelo };
      } catch {
        throw new Error(`Gemini devolvió JSON inválido: ${texto.slice(0, 200)}`);
      }
    }
  }
  throw ultimoError;
}

export async function pedirJson<T>(instruccion: string, datos: string, adjuntos: Adjunto[] = []): Promise<T> {
  return (await pedirJsonConModelo<T>(instruccion, datos, adjuntos)).datos;
}
