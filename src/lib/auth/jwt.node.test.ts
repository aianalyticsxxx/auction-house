/**
 * @vitest-environment node
 *
 * These tests run in Node.js environment to test crypto-dependent code
 * that doesn't work in jsdom (Web Crypto API / TextEncoder differences)
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken } from "./jwt";

describe("JWT Session Management (Node Environment)", () => {
  describe("createSessionToken", () => {
    it("creates a valid JWT token", async () => {
      const token = await createSessionToken(
        "TestWallet123456789012345678901234567890123",
        "user-123"
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // JWT has 3 parts separated by dots
      expect(token.split(".").length).toBe(3);
    });

    it("creates token that can be verified", async () => {
      const walletAddress = "TestWallet123456789012345678901234567890123";
      const userId = "user-456";

      const token = await createSessionToken(walletAddress, userId);
      const payload = await verifySessionToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.walletAddress).toBe(walletAddress);
      expect(payload?.userId).toBe(userId);
    });

    it("includes standard JWT claims", async () => {
      const token = await createSessionToken(
        "TestWallet123456789012345678901234567890123",
        "user-789"
      );

      // Decode payload to verify claims
      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      expect(payload.iss).toBe("auction-house");
      expect(payload.aud).toBe("auction-house-users");
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

  });

  describe("verifySessionToken (with real tokens)", () => {
    it("verifies and returns payload for valid token", async () => {
      const walletAddress = "ValidWallet12345678901234567890123456789012";
      const userId = "user-verify-test";

      const token = await createSessionToken(walletAddress, userId);
      const payload = await verifySessionToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.walletAddress).toBe(walletAddress);
      expect(payload?.userId).toBe(userId);
    });

    it("returns null for tampered token", async () => {
      const token = await createSessionToken("Wallet123456789012345678901234567890123456", "user-1");

      // Tamper with the payload
      const [header, , signature] = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ walletAddress: "HackedWallet", userId: "hacker" })
      ).toString("base64url");
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const payload = await verifySessionToken(tamperedToken);
      expect(payload).toBeNull();
    });

    it("returns null for valid token missing walletAddress", async () => {
      // Create a properly signed token but without walletAddress
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "development-secret-change-in-production-32ch"
      );
      const token = await new SignJWT({ userId: "user-123" }) // missing walletAddress
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("auction-house")
        .setAudience("auction-house-users")
        .setExpirationTime("24h")
        .sign(secret);

      const payload = await verifySessionToken(token);
      expect(payload).toBeNull();
    });

    it("returns null for valid token missing userId", async () => {
      // Create a properly signed token but without userId
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "development-secret-change-in-production-32ch"
      );
      const token = await new SignJWT({ walletAddress: "Wallet123" }) // missing userId
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("auction-house")
        .setAudience("auction-house-users")
        .setExpirationTime("24h")
        .sign(secret);

      const payload = await verifySessionToken(token);
      expect(payload).toBeNull();
    });
  });
});
