import type { Metadata } from "next";
import { tituloVacante, vacantePorToken } from "@/lib/vacante-publica";
import { salirPostulante } from "../../acciones";

export async function generateMetadata({ params }: { params: Promise<{ vacante: string }> }): Promise<Metadata> {
  return { title: await tituloVacante((await params).vacante, "Respuestas enviadas") };
}

// 4 · Respuestas enviadas. No muestra las etapas internas ni el resultado: por ahora no hay
// correos (plan de pago pendiente), así que explica cómo se entera la persona de lo que sigue.
// La entrevista la agenda gestión humana (2026-11-19, Carlos): el postulante no elige fecha.
export default async function Terminado({ params }: { params: Promise<{ vacante: string }> }) {
  const { vacante: token } = await params;
  const vacante = await vacantePorToken(token);

  return (
    <div className="contenido final">
      <div className="final__cabeza">
        <div className="final__check" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--verde)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1>Respuestas enviadas</h1>
        <p>
          Gracias. Tus respuestas para <b>{vacante.cargo}</b> ya le llegaron a {vacante.empresa_nombre}.
        </p>
      </div>

      <ol className="final__pasos" aria-label="Qué sigue">
        <li>
          <b>La empresa revisa tus respuestas</b>
          <span>Una persona de gestión humana las lee y decide quién continúa. Puede tardar unos días.</span>
        </li>
        <li>
          <b>Si hay más preguntas para ti</b>
          <span>
            Entra de nuevo con el enlace de esta vacante. Tu ID y tu contraseña son tu número de documento. Si no ves preguntas
            nuevas, tu proceso sigue en revisión.
          </span>
        </li>
        <li>
          <b>Si pasas a la entrevista</b>
          <span>
            Gestión humana te escribe con la fecha y la hora. Si no puedes asistir, responde a ese mensaje para acordar otro
            momento.
          </span>
        </li>
      </ol>

      <form action={salirPostulante}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn btn-sec btn-grande" style={{ width: "100%" }}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
