const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-wallet-address" },
        ],
      },
    ];
  },
};

// Only wrap with Sentry if DSN is configured
const sentryConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry webpack plugin options
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Suppress source map upload logs
      silent: true,

      // Upload source maps to Sentry
      widenClientFileUpload: true,

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors
      automaticVercelMonitors: true,
    })
  : nextConfig;

module.exports = sentryConfig;
