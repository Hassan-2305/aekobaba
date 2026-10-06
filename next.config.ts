import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The largest image on the site is a ~half-viewport product stage, so
    // cap the generated widths: no 3840px variants for thumbnails.
    deviceSizes: [640, 828, 1080, 1280, 1600],
    imageSizes: [48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
