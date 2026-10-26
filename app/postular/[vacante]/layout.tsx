// Las páginas de postulación dependen de la base y de cookies: no se pre-renderizan.
export const instant = false;

export default function LayoutVacantePublica({ children }: { children: React.ReactNode }) {
  return children;
}
