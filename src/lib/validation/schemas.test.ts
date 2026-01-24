import { describe, it, expect } from "vitest";
import {
  authSchema,
  createAuctionSchema,
  placeBidSchema,
  reportSchema,
} from "./schemas";

describe("Validation Schemas", () => {
  describe("authSchema", () => {
    it("should validate valid auth data", () => {
      const validData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        signature: "5KtZDxMnYH3VYK8Tpqu7nEUQBfgJYh4cAJvNFGLQVQnY",
        message: "Sign in to Art Auction\nTimestamp: 1705000000000",
      };

      const result = authSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid wallet address", () => {
      const invalidData = {
        walletAddress: "invalid-wallet",
        signature: "5KtZDxMnYH3VYK8Tpqu7nEUQBfgJYh4cAJvNFGLQVQnY",
        message: "Sign in to Art Auction\nTimestamp: 1705000000000",
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty signature", () => {
      const invalidData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        signature: "",
        message: "Sign in to Art Auction\nTimestamp: 1705000000000",
      };

      const result = authSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createAuctionSchema", () => {
    const baseValidData = {
      walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      title: "Test Artwork",
      description: "A beautiful test artwork that is at least 10 chars",
      imageUrl: "https://example.com/image.jpg",
      reservePrice: 1000000000, // 1 SOL in lamports
      minBidIncrement: 100000000, // 0.1 SOL in lamports
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      endTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    };

    it("should validate valid auction data", () => {
      const result = createAuctionSchema.safeParse(baseValidData);
      expect(result.success).toBe(true);
    });

    it("should reject title that is too short", () => {
      const invalidData = { ...baseValidData, title: "AB" };
      const result = createAuctionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject title that is too long", () => {
      const invalidData = { ...baseValidData, title: "A".repeat(101) };
      const result = createAuctionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative min bid increment", () => {
      const invalidData = { ...baseValidData, minBidIncrement: -100 };
      const result = createAuctionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept optional tags", () => {
      const dataWithTags = {
        ...baseValidData,
        tags: ["art", "digital", "nft"],
      };
      const result = createAuctionSchema.safeParse(dataWithTags);
      expect(result.success).toBe(true);
    });

    it("should reject too many tags", () => {
      const dataWithTooManyTags = {
        ...baseValidData,
        tags: Array(11).fill("tag"),
      };
      const result = createAuctionSchema.safeParse(dataWithTooManyTags);
      expect(result.success).toBe(false);
    });
  });

  describe("placeBidSchema", () => {
    it("should validate valid bid data", () => {
      const validData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: 1000000000, // 1 SOL in lamports
      };

      const result = placeBidSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject negative bid amount", () => {
      const invalidData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: -100,
      };

      const result = placeBidSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject zero bid amount", () => {
      const invalidData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: 0,
      };

      const result = placeBidSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("reportSchema", () => {
    it("should validate valid report data", () => {
      const validData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        auctionId: "123e4567-e89b-12d3-a456-426614174000",
        category: "scam",
        description: "This appears to be a scam listing",
      };

      const result = reportSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid category", () => {
      const invalidData = {
        walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        auctionId: "123e4567-e89b-12d3-a456-426614174000",
        category: "invalid_category",
        description: "Test description",
      };

      const result = reportSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept valid categories", () => {
      const categories = ["nsfw", "scam", "stolen", "harassment"];

      for (const category of categories) {
        const data = {
          walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          auctionId: "123e4567-e89b-12d3-a456-426614174000",
          category,
        };
        const result = reportSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });
});
