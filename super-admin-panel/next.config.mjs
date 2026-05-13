/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // Image Optimization for Core Web Vitals
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: false,
  },

  // Enable SWR for better performance
  swcMinify: true,

  // Optimize bundle
  compress: true,

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // Headers for SEO and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
