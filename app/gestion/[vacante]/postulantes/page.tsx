import { AnalizarTodos } from "@/components/gestion/analizar-todos";
import { ListaPostulantes } from "@/components/gestion/lista-postulantes";
import { listarEtapas } from "@/lib/gestion/configuracion";
import { etiquetasEtapas, listarPostulantes } from "@/lib/gestion/datos";

// D · Postulantes: cada uno con su código (#014) para ubicarlo rápido entre muchos.
// Hoy la vista de la base todavía oculta nombre y contacto hasta la entrevista.
// Solo aparecen postulaciones de vacantes de la empresa de la sesión (RLS).
// Una fila por candidato: número, etapa ("Etapa N · nombre"), ajuste y estado. Encima, el
// filtro por etapa, el buscador por número y la barra para comparar perfiles
// (components/gestion/lista-postulantes.tsx).
export default async function PaginaPostulantes({ params }: PageProps<"/gestion/[vacante]/postulantes">) {
  const { vacante } = await params;
  const [postulantes, etapas] = await Promise.all([listarPostulantes(vacante), listarEtapas(vacante)]);
  const etiqueta = etiquetasEtapas(etapas);

  return (
    <section className="bloque" aria-labelledby="h-postulantes">
      <div className="bloque__cabeza">
        <div>
          <h2 id="h-postulantes">Postulantes</h2>
          <p>
            Filtra por etapa para ver solo a quienes siguen ahí. Marca de 2 a 6 para compararlos. Ordenados por ajuste al cargo
            según la rúbrica; la decisión es de gestión humana.
          </p>
        </div>
      </div>

      <AnalizarTodos
        vacanteId={vacante}
        postulantes={postulantes.filter((p) => p.decision === "pendiente").map((p) => ({ id: p.id, numero: p.numero }))}
      />

      {postulantes.length === 0 ? (
        <div className="superficie superficie--relleno vacio">
          <h2>Todavía no hay postulantes</h2>
          <span className="texto-gris">Comparte el link de la vacante para empezar a recibir hojas de vida.</span>
        </div>
      ) : (
        <ListaPostulantes
          vacanteId={vacante}
          postulantes={postulantes}
          etapas={[...etapas].sort((a, b) => a.orden - b.orden).map((e) => ({ id: e.id, nombre: etiqueta.get(e.id) ?? "Etapa" }))}
        />
      )}

      <span className="texto-gris">Los CVs que la IA no pudo leer bien quedan en &quot;Por revisar&quot;: nunca se descartan solos.</span>
    </section>
  );
}
