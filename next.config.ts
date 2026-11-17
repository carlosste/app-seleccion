import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV === "development";
// Logos de empresa: hoy no hay pantalla para subirlos; cuando exista, saldrán del Storage de Supabase.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Política de contenido (CSP). Empieza en modo "Report-Only": el navegador avisa en la consola lo
// que bloquearía, sin bloquearlo. Pasa a obligatoria (Content-Security-Policy) cuando la vista
// previa no reporte violaciones en el flujo completo (registro, panel, visor de CV, postulación).
// Sin nonces a propósito: la guía de CSP de Next.js 16 dice que los nonces son incompatibles con
// Partial Prerendering (cacheComponents), que esta app usa. Por eso script-src lleva
// 'unsafe-inline' (los scripts en línea de Next.js) y el resto de directivas cierra lo demás.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ""}`,
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(desarrollo ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// La página de inicio (public/inicio/index.html) es estática y carga sus fuentes de Google Fonts:
// solo esa ruta suma fonts.googleapis.com (hoja de estilos) y fonts.gstatic.com (archivos de fuente).
const cspInicio = csp
  .replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
  .replace("font-src 'self'", "font-src 'self' https://fonts.gstatic.com");

const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SAMEORIGIN y no DENY: el visor de CV muestra el PDF en un iframe del mismo dominio.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Cámara y ubicación apagadas; micrófono solo para este sitio (grabación de voz planeada).
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las hojas de vida en PDF (hasta 4 MB) pasan del límite de 1 MB por defecto de Server
    // Actions. No subir de 4,5 MB: es lo máximo que Vercel acepta en un cuerpo.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    // La regla de "/" va después: con la misma clave, Next.js aplica la última que coincide.
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      { source: "/", headers: [{ key: "Content-Security-Policy-Report-Only", value: cspInicio }] },
    ];
  },
  async rewrites() {
    // "/" muestra la página de inicio para empresas (construida con la skill design-taste-frontend).
    return { beforeFiles: [{ source: "/", destination: "/inicio/index.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
