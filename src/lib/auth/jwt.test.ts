import { describe, it, expect } from "vitest";
import { verifySessionToken, isTokenExpiringSoon } from "./jwt";

describe("JWT Session Management", () => {
  // Note: createSessionToken tests are skipped in jsdom environment
  // due to jose library requiring Web Crypto API with proper Uint8Array support.
  // Token creation is tested in integration tests with a real Node.js environment.

  describe("verifySessionToken", () => {
    it("should return null for invalid token", async () => {
      const payload = await verifySessionToken("invalid.token.here");
      expect(payload).toBeNull();
    });

    it("should return null for empty token", async () => {
      const payload = await verifySessionToken("");
      expect(payload).toBeNull();
    });

    it("should return null for malformed JWT", async () => {
      const payload = await verifySessionToken("not.a.valid.jwt.token");
      expect(payload).toBeNull();
    });

    it("should return null for token with wrong signature", async () => {
      // Create a structurally valid JWT with wrong signature
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          walletAddress: "TestWallet",
          userId: "user-123",
          iss: "auction-house",
          aud: "auction-house-users",
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      );
      const fakeToken = `${header}.${payload}.invalid-signature`;

      const result = await verifySessionToken(fakeToken);
      expect(result).toBeNull();
    });

    it("should return null for expired token structure", async () => {
      // Even with valid structure, expired tokens should fail verification
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          walletAddress: "TestWallet",
          userId: "user-123",
          iss: "auction-house",
          aud: "auction-house-users",
          exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        })
      );
      const fakeToken = `${header}.${payload}.fake-signature`;

      const result = await verifySessionToken(fakeToken);
      expect(result).toBeNull();
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return true for invalid token", () => {
      expect(isTokenExpiringSoon("invalid")).toBe(true);
    });

    it("should return true for empty token", () => {
      expect(isTokenExpiringSoon("")).toBe(true);
    });

    it("should return true for malformed JWT", () => {
      expect(isTokenExpiringSoon("not.valid")).toBe(true);
    });

    it("should handle JWT with valid structure but invalid exp", () => {
      // Create a fake JWT with no exp field
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify({ sub: "test" }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      expect(isTokenExpiringSoon(fakeToken)).toBe(true);
    });

    it("should detect token that is expiring soon", () => {
      // Create a fake JWT that expires in 30 minutes (less than 1 hour threshold)
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const exp = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // 30 min from now
      const payload = btoa(JSON.stringify({ exp }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      expect(isTokenExpiringSoon(fakeToken)).toBe(true);
    });

    it("should detect token that is not expiring soon", () => {
      // Create a fake JWT that expires in 12 hours
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const exp = Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000); // 12 hours from now
      const payload = btoa(JSON.stringify({ exp }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      expect(isTokenExpiringSoon(fakeToken)).toBe(false);
    });

    it("should return true when exp is exactly now", () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const exp = Math.floor(Date.now() / 1000); // now
      const payload = btoa(JSON.stringify({ exp }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      expect(isTokenExpiringSoon(fakeToken)).toBe(true);
    });

    it("should return true when exp is in the past", () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const exp = Math.floor((Date.now() - 60 * 60 * 1000) / 1000); // 1 hour ago
      const payload = btoa(JSON.stringify({ exp }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      expect(isTokenExpiringSoon(fakeToken)).toBe(true);
    });

    it("should handle token with non-numeric exp", () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify({ exp: "not-a-number" }));
      const fakeToken = `${header}.${payload}.fake-signature`;

      // "not-a-number" * 1000 = NaN, Date.now() > NaN - oneHour = false
      // So this returns false (not expiring soon because NaN comparison fails)
      expect(isTokenExpiringSoon(fakeToken)).toBe(false);
    });
  });
});
