import { AnalizarTodos } from "@/components/gestion/analizar-todos";
import { ListaPostulantes } from "@/components/gestion/lista-postulantes";
import { listarPostulantes } from "@/lib/gestion/datos";

// D · Postulantes a ciegas: sin nombres ni datos personales hasta la entrevista.
// Solo aparecen postulaciones de vacantes de la empresa de la sesión (RLS).
export default async function PaginaPostulantes({ params }: PageProps<"/gestion/[vacante]/postulantes">) {
  const { vacante } = await params;
  const postulantes = await listarPostulantes(vacante);

  return (
    <>
      <div className="nota nota-az">
        Revisión a ciegas: nombres y datos personales ocultos hasta la entrevista. La IA ordena y puntúa; la decisión es de gestión humana.
      </div>

      <AnalizarTodos
        vacanteId={vacante}
        postulantes={postulantes.filter((p) => p.decision === "pendiente").map((p) => ({ id: p.id, numero: p.numero }))}
      />

      {postulantes.length === 0 ? (
        <div className="tarjeta vacio">
          <h2 style={{ fontSize: 18 }}>Todavía no hay postulantes</h2>
          <span className="texto-gris">Comparte el link de la vacante para empezar a recibir hojas de vida.</span>
        </div>
      ) : (
        <ListaPostulantes vacanteId={vacante} postulantes={postulantes} />
      )}

      <div className="texto-gris">
        Ordenado por ajuste al cargo según la rúbrica. Los CVs que la IA no pudo leer bien quedan en &quot;Por revisar&quot;.
      </div>
    </>
  );
}
