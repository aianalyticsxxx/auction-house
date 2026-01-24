import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay - only in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Only enable in production or when DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out known non-actionable errors
  ignoreErrors: [
    // Wallet adapter connection issues (user-initiated)
    "WalletNotConnectedError",
    "WalletConnectionError",
    "WalletDisconnectedError",
    // Network errors that are expected during poor connectivity
    "NetworkError",
    "Failed to fetch",
  ],

  // Attach additional context
  beforeSend(event) {
    // Don't send events in development unless DSN is explicitly set
    if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    return event;
  },
});
