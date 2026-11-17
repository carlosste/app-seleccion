import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

// Onest: la tipografía que repartió la skill design-taste-frontend (2026-11-16), la misma del
// inicio en public/inicio. next/font la sirve desde el propio dominio, así que no toca la CSP.
const onest = Onest({
  variable: "--font-texto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Selección de personal",
  description: "Postulaciones y gestión humana con apoyo de IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={onest.variable}>
      <body>{children}</body>
    </html>
  );
}
