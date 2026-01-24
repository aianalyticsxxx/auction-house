import { z } from "zod";

// Server-side required environment variables
const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Solana
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "mainnet-beta", "testnet"]).optional(),

  // Rate Limiting (optional for development)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cron Jobs
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").optional(),

  // CORS
  ALLOWED_ORIGIN: z.string().optional(),

  // Sentry (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

// Client-side environment variables (prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "mainnet-beta", "testnet"]).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

let serverEnvCache: ServerEnv | null = null;
let clientEnvCache: ClientEnv | null = null;

/**
 * Validates and returns server-side environment variables.
 * Call this early in the app lifecycle to fail fast on missing config.
 */
export function getServerEnv(): ServerEnv {
  if (serverEnvCache) return serverEnvCache;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  serverEnvCache = result.data;
  return serverEnvCache;
}

/**
 * Validates and returns client-side environment variables.
 */
export function getClientEnv(): ClientEnv {
  if (clientEnvCache) return clientEnvCache;

  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Client environment validation failed:\n${errors}`);
  }

  clientEnvCache = result.data;
  return clientEnvCache;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if we're running on the server
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}
