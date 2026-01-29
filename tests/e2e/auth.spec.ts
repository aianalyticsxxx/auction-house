import { test, expect } from "@playwright/test";
import { createMockWalletScript, TEST_WALLETS } from "../mocks/wallet";
import { createMockAuthScript } from "../mocks/auth";

test.describe("Authentication Flow", () => {
  test("shows connect wallet button when not authenticated", async ({ page }) => {
    await page.goto("/");

    // Connect wallet button should be visible
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
  });

  test("shows user info when authenticated", async ({ page }) => {
    // Inject mock wallet and auth
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(
      createMockAuthScript(TEST_WALLETS.winner)
    );

    // Mock the user API response
    await page.route("**/api/users/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user-id",
          wallet_address: TEST_WALLETS.winner,
          username: null,
          credits: 100,
          strikes: 0,
        }),
      });
    });

    await page.goto("/");

    // Should show truncated wallet address or profile link
    await expect(page.getByText(/7nYm.*JvZB/i).or(page.getByRole("link", { name: /profile/i }))).toBeVisible();
  });

  test("profile page shows user stats", async ({ page }) => {
    // Inject mock wallet and auth
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(
      createMockAuthScript(TEST_WALLETS.winner)
    );

    // Mock profile API
    await page.route("**/api/users/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user-id",
          wallet_address: TEST_WALLETS.winner,
          username: "TestUser",
          credits: 100,
          strikes: 0,
          stats: {
            auctions_created: 5,
            auctions_won: 3,
            total_bids: 25,
          },
        }),
      });
    });

    await page.goto("/profile");

    // Should show profile info
    await expect(page.getByText("100")).toBeVisible(); // credits
  });

  test("unauthenticated user cannot access create page form", async ({ page }) => {
    await page.goto("/create");

    // Should show connect wallet prompt or redirect
    await expect(
      page.getByText(/connect.*wallet/i).or(page.getByRole("button", { name: /connect/i }))
    ).toBeVisible();
  });
});
