import { redirect } from "next/navigation";

// El ingreso de empresas vive en /empresa/ingreso. Esta ruta queda por compatibilidad.
export default function Acceso() {
  redirect("/empresa/ingreso");
}
