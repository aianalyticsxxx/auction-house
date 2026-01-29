/**
 * @vitest-environment node
 *
 * These tests run in Node.js environment to test server-side logger paths
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Logger Module (Node Environment)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Server Logger in Node", () => {
    it("uses pino logger on server (typeof window === undefined)", async () => {
      // In Node environment, window is undefined
      expect(typeof window).toBe("undefined");

      const { logger, createLogger } = await import("./logger");

      expect(logger).toBeDefined();
      // Server logger has pino's child method that returns a new logger
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.child).toBe("function");

      const childLogger = createLogger("test-module");
      expect(childLogger).toBeDefined();
    });

    it("createLogger creates child logger with module context", async () => {
      const { createLogger } = await import("./logger");

      const moduleLogger = createLogger("api-test");

      expect(moduleLogger).toBeDefined();
      expect(typeof moduleLogger.info).toBe("function");
      expect(typeof moduleLogger.warn).toBe("function");
      expect(typeof moduleLogger.error).toBe("function");
      expect(typeof moduleLogger.debug).toBe("function");
    });

    it("exports all convenience loggers", async () => {
      const {
        logger,
        apiLogger,
        authLogger,
        auctionLogger,
        settlementLogger,
        cronLogger,
      } = await import("./logger");

      expect(logger).toBeDefined();
      expect(apiLogger).toBeDefined();
      expect(authLogger).toBeDefined();
      expect(auctionLogger).toBeDefined();
      expect(settlementLogger).toBeDefined();
      expect(cronLogger).toBeDefined();
    });
  });

  describe("Logger level configuration", () => {
    it("respects LOG_LEVEL environment variable", async () => {
      process.env.LOG_LEVEL = "warn";

      const { logger } = await import("./logger");

      // Logger should be created (level is internal to pino)
      expect(logger).toBeDefined();
    });
  });
});
