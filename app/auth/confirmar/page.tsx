import { Suspense } from "react";
import { confirmarCorreo } from "@/lib/auth/acciones";
import { BotonEnviar } from "@/components/auth/boton-enviar";

export const metadata = { title: "Confirmar correo · Selección" };

export default function Confirmar({ searchParams }: PageProps<"/auth/confirmar">) {
  return (
    <main className="auth-pantalla">
      <section className="tarjeta auth-tarjeta">
        <h1 style={{ fontSize: 22 }}>Activa tu cuenta</h1>
        <Suspense fallback={<p className="texto-gris">Cargando…</p>}>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function Formulario({ searchParams }: Pick<PageProps<"/auth/confirmar">, "searchParams">) {
  const params = await searchParams;
  const token = typeof params.token_hash === "string" ? params.token_hash : "";

  if (!token || params.type !== "magiclink") {
    return (
      <div className="nota nota-na" role="alert">
        El enlace no es válido. Inicia sesión y te enviaremos uno nuevo.
      </div>
    );
  }

  return (
    <form action={confirmarCorreo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="texto-gris" style={{ lineHeight: 1.5 }}>
        Confirma tu correo corporativo para entrar al panel de tu empresa.
      </p>
      <input type="hidden" name="token_hash" value={token} />
      <BotonEnviar texto="Confirmar y entrar" textoCargando="Confirmando…" />
    </form>
  );
}
