/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  /** Evita que `/` y `/chat` queden “pegados” a un deploy viejo en navegador o iframe (p. ej. Wix). */
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/chat",
        headers: [{ key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    /** Next 14: evita que Webpack empaquete `.node` de resvg (rompe `next build` en Vercel). */
    serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp"],
  },
  // Evita el warning "Caching failed for pack" en dev (opcional)
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
