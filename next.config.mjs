/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // Evita el warning "Caching failed for pack" en dev (opcional)
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
