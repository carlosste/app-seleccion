import { Suspense } from "react";
import { NavGestion, NavGestionEsqueleto } from "@/components/nav-gestion";
import { requerirEmpresa } from "@/lib/auth/sesion-empresa";

// Todo el panel exige una sesión de empresa. proxy.ts ya filtra antes, pero aquí
// se verifica de nuevo en el servidor (el proxy no debe ser la única barrera).
export default function LayoutGestion({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<NavGestionEsqueleto />}>
        <NavGestion />
      </Suspense>
      <div className="main">
        <Suspense fallback={<p className="texto-gris">Cargando…</p>}>
          <Protegido>{children}</Protegido>
        </Suspense>
      </div>
    </>
  );
}

async function Protegido({ children }: { children: React.ReactNode }) {
  await requerirEmpresa();
  return children;
}
