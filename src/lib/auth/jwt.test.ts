import { describe, it, expect } from "vitest";
import { verifySessionToken, isTokenExpiringSoon } from "./jwt";

describe("JWT Session Management", () => {
  // Note: createSessionToken tests are skipped in jsdom environment
  // due to Web Crypto API limitations. These are tested in integration tests.

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
  });
});
