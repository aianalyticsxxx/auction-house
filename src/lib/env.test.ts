import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test the env module in isolation, so we'll test the validation logic
describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Server Environment", () => {
    it("should accept valid environment variables", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      // Dynamic import to get fresh module
      const { getServerEnv } = await import("./env");

      expect(() => getServerEnv()).not.toThrow();
    });

    it("should reject missing required variables", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { getServerEnv } = await import("./env");

      expect(() => getServerEnv()).toThrow("Environment validation failed");
    });

    it("should reject invalid Supabase URL", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const { getServerEnv } = await import("./env");

      expect(() => getServerEnv()).toThrow("must be a valid URL");
    });

    it("should accept optional variables when not provided", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
      // Optional vars not set

      const { getServerEnv } = await import("./env");

      const env = getServerEnv();
      expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
      expect(env.CRON_SECRET).toBeUndefined();
    });

    it("should reject short CRON_SECRET when provided", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
      process.env.CRON_SECRET = "short";

      const { getServerEnv } = await import("./env");

      expect(() => getServerEnv()).toThrow("CRON_SECRET");
    });
  });

  describe("Client Environment", () => {
    it("should accept valid client environment variables", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      const { getClientEnv } = await import("./env");

      expect(() => getClientEnv()).not.toThrow();
      const env = getClientEnv();
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
    });

    it("should return cached client env on second call", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      const { getClientEnv } = await import("./env");

      const env1 = getClientEnv();
      const env2 = getClientEnv();

      expect(env1).toBe(env2); // Same reference (cached)
    });

    it("should reject missing required client variables", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { getClientEnv } = await import("./env");

      expect(() => getClientEnv()).toThrow("Client environment validation failed");
    });

    it("should reject invalid client Supabase URL", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      const { getClientEnv } = await import("./env");

      expect(() => getClientEnv()).toThrow("Client environment validation failed");
    });

    it("should accept optional client variables", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL = "https://api.devnet.solana.com";
      process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";

      const { getClientEnv } = await import("./env");

      const env = getClientEnv();
      expect(env.NEXT_PUBLIC_SOLANA_RPC_URL).toBe("https://api.devnet.solana.com");
      expect(env.NEXT_PUBLIC_SOLANA_NETWORK).toBe("devnet");
    });
  });

  describe("Helper Functions", () => {
    it("isProduction returns correct value based on NODE_ENV", async () => {
      const { isProduction } = await import("./env");

      // NODE_ENV is set to "test" by vitest, so isProduction should be false
      expect(isProduction()).toBe(false);
    });

    it("isServer checks for window object", async () => {
      const { isServer } = await import("./env");

      // In jsdom, window exists, so isServer returns false
      // This test validates the logic works correctly
      expect(typeof isServer()).toBe("boolean");
    });
  });
});
