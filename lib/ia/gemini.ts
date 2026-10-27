import "server-only";

// Llamada a Gemini solo desde el servidor. La clave nunca sale al navegador.
const MODELO = "gemini-3.1-flash-lite";

const REGLAS =
  "Responde solo con JSON válido, en español. Nunca propongas requisitos ni preguntas sobre edad máxima, " +
  "género, estado civil, acento, tono de voz ni rasgos personales. La edad mínima sí puede pedirse.";

export async function pedirJson<T>(instruccion: string, datos: string): Promise<T> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) throw new Error("Falta GEMINI_API_KEY en el servidor");

  const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${REGLAS}\n${instruccion}` }] },
      contents: [{ role: "user", parts: [{ text: datos }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });
  if (!respuesta.ok) throw new Error(`Gemini respondió ${respuesta.status}`);

  const json = await respuesta.json();
  const texto: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Gemini no devolvió texto");
  return JSON.parse(texto) as T;
}
