import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const idAppOrigin = (process.env.SSTIPOS_ID_APP_ORIGIN ?? "https://sstipos-id.vercel.app").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd()
  },
  transpilePackages: ["@pos/shared-types", "@pos/pos-domain", "@pos/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async rewrites() {
    const loginReferrerPattern = ".*\\/(login|scan)(\\/|\\?|$).*";
    return {
      beforeFiles: [
        {
          source: "/login/:path*",
          destination: `${idAppOrigin}/login/:path*`
        },
        {
          source: "/scan/:path*",
          destination: `${idAppOrigin}/scan/:path*`
        },
        {
          source: "/api/auth/:path*",
          destination: `${idAppOrigin}/api/auth/:path*`
        },
        {
          source: "/api/store/:path*",
          destination: `${idAppOrigin}/api/store/:path*`
        },
        {
          source: "/api/mobile/:path*",
          destination: `${idAppOrigin}/api/mobile/:path*`
        },
        {
          source: "/api/verify",
          destination: `${idAppOrigin}/api/verify`
        },
        {
          source: "/_next/:path*",
          has: [{ type: "header", key: "referer", value: loginReferrerPattern }],
          destination: `${idAppOrigin}/_next/:path*`
        },
        {
          source: "/brand/:path*",
          has: [{ type: "header", key: "referer", value: loginReferrerPattern }],
          destination: `${idAppOrigin}/brand/:path*`
        }
      ]
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
