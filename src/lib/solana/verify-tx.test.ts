import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Create mock functions that will be used
const mockGetParsedTransaction = vi.fn();
const mockGetSignatureStatus = vi.fn();

// Mock the Connection class
vi.mock("@solana/web3.js", async () => {
  const actual = await vi.importActual("@solana/web3.js");
  return {
    ...actual,
    Connection: class MockConnection {
      constructor() {}
      getParsedTransaction = mockGetParsedTransaction;
      getSignatureStatus = mockGetSignatureStatus;
    },
  };
});

import {
  verifyPaymentTransaction,
  waitForTransactionConfirmation,
} from "./verify-tx";

describe("verifyPaymentTransaction", () => {
  const testSender = "SenderPubKey111111111111111111111111111111111";
  const testRecipient = "RecipientPubKey22222222222222222222222222222";
  const testSignature = "5TestSignature123456789abcdef";
  const testAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns invalid when transaction is not found", async () => {
    mockGetParsedTransaction.mockResolvedValue(null);

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Transaction not found");
  });

  it("returns invalid when transaction has error", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: { InstructionError: [0, "Custom"] } },
      transaction: { message: { instructions: [] } },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Transaction failed");
  });

  it("returns valid for correct transfer instruction", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: testRecipient,
                  lamports: testAmount,
                },
              },
              program: "system",
            },
          ],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(true);
    expect(result.amount).toBe(testAmount);
    expect(result.sender).toBe(testSender);
    expect(result.recipient).toBe(testRecipient);
  });

  it("returns invalid when sender does not match", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null, preBalances: [], postBalances: [] },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: "WrongSender11111111111111111111111111111111",
                  destination: testRecipient,
                  lamports: testAmount,
                },
              },
              program: "system",
            },
          ],
          accountKeys: [],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("returns invalid when recipient does not match", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null, preBalances: [], postBalances: [] },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: "WrongRecipient1111111111111111111111111111",
                  lamports: testAmount,
                },
              },
              program: "system",
            },
          ],
          accountKeys: [],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("returns invalid when amount differs by more than tolerance", async () => {
    const wrongAmount = testAmount + 0.02 * LAMPORTS_PER_SOL; // 0.02 SOL more

    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null, preBalances: [], postBalances: [] },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: testRecipient,
                  lamports: wrongAmount,
                },
              },
              program: "system",
            },
          ],
          accountKeys: [],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("returns valid when amount is within tolerance (0.01 SOL)", async () => {
    const slightlyDifferentAmount = testAmount + 0.005 * LAMPORTS_PER_SOL; // 0.005 SOL variance

    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: testRecipient,
                  lamports: slightlyDifferentAmount,
                },
              },
              program: "system",
            },
          ],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(true);
    expect(result.amount).toBe(slightlyDifferentAmount);
  });

  it("uses fallback balance check when no transfer instruction found", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: {
        err: null,
        preBalances: [2 * LAMPORTS_PER_SOL, 0], // sender had 2 SOL, recipient had 0
        postBalances: [1 * LAMPORTS_PER_SOL, 1 * LAMPORTS_PER_SOL], // after: sender 1, recipient 1
      },
      transaction: {
        message: {
          instructions: [
            {
              // Non-transfer instruction
              program: "unknown",
            },
          ],
          accountKeys: [testSender, testRecipient],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(true);
    expect(result.amount).toBe(testAmount);
    expect(result.recipient).toBe(testRecipient);
  });

  it("handles fallback with PublicKey objects in accountKeys", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: {
        err: null,
        preBalances: [2 * LAMPORTS_PER_SOL, 0],
        postBalances: [1 * LAMPORTS_PER_SOL, 1 * LAMPORTS_PER_SOL],
      },
      transaction: {
        message: {
          instructions: [],
          accountKeys: [
            { pubkey: { toBase58: () => testSender } },
            { pubkey: { toBase58: () => testRecipient } },
          ],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(true);
    expect(result.amount).toBe(testAmount);
  });

  it("returns invalid in fallback when balance change is outside tolerance", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: {
        err: null,
        preBalances: [2 * LAMPORTS_PER_SOL, 0],
        postBalances: [1.5 * LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL], // Only 0.5 SOL received
      },
      transaction: {
        message: {
          instructions: [],
          accountKeys: [testSender, testRecipient],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("handles network errors gracefully", async () => {
    mockGetParsedTransaction.mockRejectedValue(new Error("Network timeout"));

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Network timeout");
  });

  it("handles non-Error thrown values", async () => {
    mockGetParsedTransaction.mockRejectedValue("String error");

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Verification failed");
  });

  it("skips non-system program instructions", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null, preBalances: [], postBalances: [] },
      transaction: {
        message: {
          instructions: [
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: testRecipient,
                  lamports: testAmount,
                },
              },
              program: "token", // Not system program
            },
          ],
          accountKeys: [],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("handles instructions without parsed field", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null, preBalances: [], postBalances: [] },
      transaction: {
        message: {
          instructions: [
            {
              // No 'parsed' field - raw instruction
              programId: "11111111111111111111111111111111",
              data: "base64data",
            },
          ],
          accountKeys: [],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("No matching transfer found in transaction");
  });

  it("handles multiple instructions and finds the correct one", async () => {
    mockGetParsedTransaction.mockResolvedValue({
      meta: { err: null },
      transaction: {
        message: {
          instructions: [
            // First instruction - wrong sender
            {
              parsed: {
                type: "transfer",
                info: {
                  source: "WrongSender11111111111111111111111111111111",
                  destination: testRecipient,
                  lamports: testAmount,
                },
              },
              program: "system",
            },
            // Second instruction - correct
            {
              parsed: {
                type: "transfer",
                info: {
                  source: testSender,
                  destination: testRecipient,
                  lamports: testAmount,
                },
              },
              program: "system",
            },
          ],
        },
      },
    });

    const result = await verifyPaymentTransaction(
      testSignature,
      testSender,
      testRecipient,
      testAmount
    );

    expect(result.isValid).toBe(true);
    expect(result.sender).toBe(testSender);
  });
});

describe("waitForTransactionConfirmation", () => {
  const testSignature = "5TestSignature123456789abcdef";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns true when transaction is finalized immediately", async () => {
    mockGetSignatureStatus.mockResolvedValue({
      value: { confirmationStatus: "finalized", err: null },
    });

    const resultPromise = waitForTransactionConfirmation(testSignature, 5000);
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it("returns false when transaction has error", async () => {
    mockGetSignatureStatus.mockResolvedValue({
      value: { confirmationStatus: "confirmed", err: { Custom: 1 } },
    });

    const resultPromise = waitForTransactionConfirmation(testSignature, 5000);
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe(false);
  });

  it("returns false when timeout is reached", async () => {
    // Always return processing status
    mockGetSignatureStatus.mockResolvedValue({
      value: { confirmationStatus: "processed", err: null },
    });

    const resultPromise = waitForTransactionConfirmation(testSignature, 4000);

    // Advance time past the timeout
    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;
    expect(result).toBe(false);
  });

  it("polls until finalized", async () => {
    // First call: processing, second call: finalized
    mockGetSignatureStatus
      .mockResolvedValueOnce({
        value: { confirmationStatus: "processed", err: null },
      })
      .mockResolvedValueOnce({
        value: { confirmationStatus: "finalized", err: null },
      });

    const resultPromise = waitForTransactionConfirmation(testSignature, 10000);

    // First check
    await vi.advanceTimersByTimeAsync(100);
    // Wait for poll interval (2000ms)
    await vi.advanceTimersByTimeAsync(2100);

    const result = await resultPromise;
    expect(result).toBe(true);
    expect(mockGetSignatureStatus).toHaveBeenCalledTimes(2);
  });

  it("continues polling after network error", async () => {
    mockGetSignatureStatus
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        value: { confirmationStatus: "finalized", err: null },
      });

    const resultPromise = waitForTransactionConfirmation(testSignature, 10000);

    // First check (fails)
    await vi.advanceTimersByTimeAsync(100);
    // Wait for poll interval
    await vi.advanceTimersByTimeAsync(2100);
    // Second check
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe(true);
  });
});
