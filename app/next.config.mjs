/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "awiealex.de",
        pathname: "/flags/**",
      },
    ],
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Required by the Coolify Dockerfile (copies .next/standalone).
  output: "standalone",
};

export default nextConfig;
