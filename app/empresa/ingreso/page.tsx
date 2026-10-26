import { Suspense } from "react";
import { FormularioIngreso } from "@/components/auth/formulario-ingreso";

export const metadata = { title: "Ingreso de empresas · Selección" };

export default function IngresoEmpresa({ searchParams }: PageProps<"/empresa/ingreso">) {
  return (
    <section className="tarjeta auth-tarjeta">
      <div className="auth-cabecera">
        <div className="logo">SEL</div>
        <h1>Ingreso de empresas</h1>
        <p className="texto-gris">Entra al panel de gestión humana de tu empresa.</p>
      </div>
      <Suspense fallback={<FormularioIngreso />}>
        <ConParametros searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ConParametros({ searchParams }: Pick<PageProps<"/empresa/ingreso">, "searchParams">) {
  const p = await searchParams;
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return <FormularioIngreso siguiente={texto(p.siguiente)} aviso={texto(p.error)} />;
}
