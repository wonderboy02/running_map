import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "btxtexwnlirtabwzfckz.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        search: "",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/storage/:path*",
        destination:
          "https://btxtexwnlirtabwzfckz.supabase.co/storage/v1/object/public/:path*",
      },
    ];
  },
};

export default nextConfig;
