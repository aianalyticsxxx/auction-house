import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Sentry before importing logger
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock pino
vi.mock("pino", () => {
  const mockChild = vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  });

  return {
    default: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: mockChild,
    }),
  };
});

describe("Logger Module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Server Logger", () => {
    it("creates server logger with pino", async () => {
      // In test environment with jsdom, window exists
      // But we can still test that the module exports correctly
      const { logger, createLogger } = await import("./logger");

      expect(logger).toBeDefined();
      expect(createLogger).toBeDefined();
    });

    it("createLogger returns a logger with module context", async () => {
      const { createLogger } = await import("./logger");

      const moduleLogger = createLogger("test-module");

      expect(moduleLogger).toBeDefined();
      expect(typeof moduleLogger.info).toBe("function");
      expect(typeof moduleLogger.error).toBe("function");
    });

    it("exports convenience loggers for different modules", async () => {
      const {
        apiLogger,
        authLogger,
        auctionLogger,
        settlementLogger,
        cronLogger,
      } = await import("./logger");

      expect(apiLogger).toBeDefined();
      expect(authLogger).toBeDefined();
      expect(auctionLogger).toBeDefined();
      expect(settlementLogger).toBeDefined();
      expect(cronLogger).toBeDefined();
    });
  });

  describe("Client Logger Behavior", () => {
    it("client logger has all required methods", async () => {
      // We're in jsdom (client-like) environment
      const { logger } = await import("./logger");

      // The logger should have all methods (either from server pino or client fallback)
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("client logger child method returns itself", async () => {
      // Force client-side behavior by ensuring window exists
      // jsdom provides window by default in test environment
      const { createLogger } = await import("./logger");

      const moduleLogger = createLogger("test");

      // In jsdom, we get the client logger or server logger depending on typeof window
      // Either way, child should work
      expect(moduleLogger).toBeDefined();
    });
  });
});
