import { Marca } from "@/components/marca";

export default function LayoutEmpresaAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-pantalla">
      <div className="auth-columna">
        <Marca />
        {children}
      </div>
    </main>
  );
}
