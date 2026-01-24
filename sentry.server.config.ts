import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Only enable when DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out known non-actionable errors
  ignoreErrors: [
    // Rate limit errors are expected behavior
    "RateLimitError",
  ],

  // Attach additional context
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Add custom tags for easier filtering
    if (error && typeof error === "object" && "code" in error) {
      event.tags = {
        ...event.tags,
        error_code: String(error.code),
      };
    }

    return event;
  },
});
