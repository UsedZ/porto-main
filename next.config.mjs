import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
  },
  experimental: {
    optimizeCss: true,
  },
  // Turbopack reads tsconfig.json paths (not jsconfig.json) for module
  // resolution and code-splitting. Register the @/* alias here so the
  // lazy Scene3D scene imports (components/Hero.jsx) generate a proper
  // separate chunk instead of being silently dropped.
  turbopack: {
    resolveAlias: {
      '@': '.',
    },
  },
};

export default nextConfig;
