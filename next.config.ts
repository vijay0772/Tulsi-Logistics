import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
