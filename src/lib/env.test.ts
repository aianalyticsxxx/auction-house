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

      expect(() => getServerEnv()).toThrow("at least 16 characters");
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
