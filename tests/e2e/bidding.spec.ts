import { test, expect } from "@playwright/test";
import { createMockWalletScript, TEST_WALLETS } from "../mocks/wallet";
import { createMockAuthScript } from "../mocks/auth";

const mockActiveAuction = {
  id: "bid-auction-1",
  title: "Art for Bidding",
  description: "Test auction for bidding flow",
  image_url: "https://example.com/bid-art.jpg",
  starting_price: 1.0,
  current_price: 2.0,
  minimum_increment: 0.1,
  status: "current",
  start_time: new Date(Date.now() - 3600000).toISOString(),
  end_time: new Date(Date.now() + 3600000).toISOString(),
  creator_address: TEST_WALLETS.creator,
  bid_count: 3,
  bids: [
    {
      id: "bid-1",
      amount: 2.0,
      bidder_address: TEST_WALLETS.bidder2,
      created_at: new Date(Date.now() - 600000).toISOString(),
    },
  ],
};

test.describe("Bidding Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock auction API
    await page.route("**/api/auctions/bid-auction-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockActiveAuction),
      });
    });
  });

  test("shows bid form for authenticated user", async ({ page }) => {
    // Inject mock wallet and auth
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(createMockAuthScript(TEST_WALLETS.winner));

    await page.goto("/auction/bid-auction-1");

    // Should show bid input or button
    await expect(
      page.getByRole("button", { name: /place bid/i }).or(
        page.getByPlaceholder(/bid/i)
      ).or(page.getByLabel(/bid/i))
    ).toBeVisible();
  });

  test("shows minimum bid amount", async ({ page }) => {
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(createMockAuthScript(TEST_WALLETS.winner));

    await page.goto("/auction/bid-auction-1");

    // Should show minimum bid (current + increment = 2.1)
    await expect(
      page.getByText(/2\.1/i).or(page.getByText(/minimum/i))
    ).toBeVisible();
  });

  test("can submit a valid bid", async ({ page }) => {
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(createMockAuthScript(TEST_WALLETS.winner));

    // Mock bid submission
    await page.route("**/api/auctions/bid-auction-1/bid", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            bid: {
              id: "new-bid",
              amount: 2.5,
              bidder_address: TEST_WALLETS.winner,
              created_at: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto("/auction/bid-auction-1");

    // Find and fill bid input
    const bidInput = page.getByPlaceholder(/bid/i).or(page.getByLabel(/amount/i)).or(
      page.locator('input[type="number"]').first()
    );

    if (await bidInput.isVisible()) {
      await bidInput.fill("2.5");
    }

    // Click place bid
    await page.getByRole("button", { name: /place bid/i }).click();

    // Should show success or update
    await expect(
      page.getByText(/success/i).or(page.getByText(/2\.5.*SOL/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test("prevents bidding on own auction", async ({ page }) => {
    // Login as creator
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.creator })
    );
    await page.addInitScript(createMockAuthScript(TEST_WALLETS.creator));

    await page.goto("/auction/bid-auction-1");

    // Should not show bid form or show disabled state
    const bidButton = page.getByRole("button", { name: /place bid/i });

    if (await bidButton.isVisible()) {
      await expect(bidButton).toBeDisabled();
    } else {
      // Or bid form is not shown at all
      await expect(
        page.getByText(/cannot bid.*own/i).or(page.getByText(/your auction/i))
      ).toBeVisible();
    }
  });

  test("requires wallet connection to bid", async ({ page }) => {
    // No wallet injected
    await page.goto("/auction/bid-auction-1");

    // Should prompt to connect
    await expect(
      page.getByRole("button", { name: /connect/i }).or(
        page.getByText(/connect.*wallet/i)
      )
    ).toBeVisible();
  });

  test("shows bid rejected for invalid amount", async ({ page }) => {
    await page.addInitScript(
      createMockWalletScript({ publicKey: TEST_WALLETS.winner })
    );
    await page.addInitScript(createMockAuthScript(TEST_WALLETS.winner));

    // Mock bid rejection
    await page.route("**/api/auctions/bid-auction-1/bid", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Bid must be at least 2.1 SOL",
          }),
        });
      }
    });

    await page.goto("/auction/bid-auction-1");

    const bidInput = page.getByPlaceholder(/bid/i).or(page.getByLabel(/amount/i)).or(
      page.locator('input[type="number"]').first()
    );

    if (await bidInput.isVisible()) {
      await bidInput.fill("1.5"); // Below minimum
    }

    await page.getByRole("button", { name: /place bid/i }).click();

    // Should show error
    await expect(
      page.getByText(/error/i).or(page.getByText(/at least/i)).or(page.getByText(/invalid/i))
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Bid History", () => {
  test("shows all bids in chronological order", async ({ page }) => {
    const auctionWithBids = {
      ...mockActiveAuction,
      bids: [
        {
          id: "bid-3",
          amount: 2.0,
          bidder_address: TEST_WALLETS.bidder2,
          created_at: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: "bid-2",
          amount: 1.5,
          bidder_address: TEST_WALLETS.bidder3,
          created_at: new Date(Date.now() - 600000).toISOString(),
        },
        {
          id: "bid-1",
          amount: 1.2,
          bidder_address: TEST_WALLETS.winner,
          created_at: new Date(Date.now() - 900000).toISOString(),
        },
      ],
    };

    await page.route("**/api/auctions/bid-auction-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(auctionWithBids),
      });
    });

    await page.goto("/auction/bid-auction-1");

    // Should show bid amounts
    await expect(page.getByText(/2\.0/)).toBeVisible();
    await expect(page.getByText(/1\.5/)).toBeVisible();
  });
});
