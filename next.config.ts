import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las hojas de vida en PDF pueden pasar del límite de 1 MB por defecto de Server Actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
