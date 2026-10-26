import { FormularioRegistro } from "@/components/auth/formulario-registro";

export const metadata = { title: "Registro de empresas · Selección" };

export default function RegistroEmpresa() {
  return (
    <section className="tarjeta auth-tarjeta auth-tarjeta-ancha">
      <div className="auth-cabecera">
        <div className="logo">SEL</div>
        <h1>Registra tu empresa</h1>
        <p className="texto-gris">
          Crea la cuenta de gestión humana para publicar vacantes y revisar postulantes a ciegas.
        </p>
      </div>
      <FormularioRegistro />
    </section>
  );
}
