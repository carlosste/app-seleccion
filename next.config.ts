import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las hojas de vida en PDF (hasta 4 MB) pasan del límite de 1 MB por defecto de Server
    // Actions. No subir de 4,5 MB: es lo máximo que Vercel acepta en un cuerpo.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
