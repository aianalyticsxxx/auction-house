import pino from "pino";
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const isServer = typeof window === "undefined";

// Server-side logger with proper formatting
const serverLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {
        // JSON format for production (for log aggregation)
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Pretty print for development
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }),
});

// Client-side fallback (pino doesn't work in browser)
const clientLogger = {
  info: () => {},
  warn: () => {},
  error: (obj: unknown, msg?: string) => {
    // In production, send to Sentry instead of console
    if (isProduction && typeof obj === "object" && obj !== null) {
      Sentry.captureException(obj);
    }
  },
  debug: () => {},
  child: () => clientLogger,
};

export const logger = isServer ? serverLogger : clientLogger;

// Create child loggers for different modules
export const createLogger = (module: string) => {
  if (isServer) {
    return serverLogger.child({ module });
  }
  return clientLogger;
};

// Convenience functions for API routes
export const apiLogger = createLogger("api");
export const authLogger = createLogger("auth");
export const auctionLogger = createLogger("auction");
export const settlementLogger = createLogger("settlement");
export const cronLogger = createLogger("cron");
