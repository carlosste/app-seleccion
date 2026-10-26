import { vacantes } from "@/lib/datos-prueba";

// Con datos fijos, las rutas se generan en build. En Fase 2 (base de datos) se revisa.
export function generateStaticParams() {
  return vacantes.map((v) => ({ vacante: v.id }));
}

export default function LayoutVacantePublica({ children }: { children: React.ReactNode }) {
  return children;
}
