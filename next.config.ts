import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9002",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9002",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pendampingantkml.kemnaker.go.id",
        pathname: "/**",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
    const minioPort = process.env.MINIO_PORT || "9002";
    const minioUseSSL = process.env.MINIO_USE_SSL === "true";
    const minioBucket = process.env.MINIO_BUCKET || "pendampingan";
    const minioUrl = `${minioUseSSL ? "https" : "http"}://${minioEndpoint}:${minioPort}`;

    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/:path*`,
      },
      {
        source: `/${minioBucket}/:path*`,
        destination: `${minioUrl}/${minioBucket}/:path*`,
      },
    ];
  },
};

export default nextConfig;
