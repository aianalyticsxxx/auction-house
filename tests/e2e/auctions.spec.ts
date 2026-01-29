import { test, expect } from "@playwright/test";

const mockAuctions = [
  {
    id: "auction-1",
    title: "Digital Art #1",
    description: "A beautiful digital artwork",
    image_url: "https://example.com/art1.jpg",
    starting_price: 1.0,
    current_price: 2.5,
    status: "current",
    start_time: new Date(Date.now() - 3600000).toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    creator_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    bid_count: 5,
  },
  {
    id: "auction-2",
    title: "Pixel Art Collection",
    description: "Retro pixel art",
    image_url: "https://example.com/art2.jpg",
    starting_price: 0.5,
    current_price: 0.5,
    status: "upcoming",
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 172800000).toISOString(),
    creator_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    bid_count: 0,
  },
  {
    id: "auction-3",
    title: "Abstract Waves",
    description: "Abstract digital art",
    image_url: "https://example.com/art3.jpg",
    starting_price: 2.0,
    current_price: 5.0,
    status: "past",
    start_time: new Date(Date.now() - 172800000).toISOString(),
    end_time: new Date(Date.now() - 86400000).toISOString(),
    creator_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    bid_count: 12,
  },
];

test.describe("Auction Browsing", () => {
  test.beforeEach(async ({ page }) => {
    // Mock auctions API
    await page.route("**/api/auctions*", async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");

      let filtered = mockAuctions;
      if (status) {
        filtered = mockAuctions.filter((a) => a.status === status);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          auctions: filtered,
          total: filtered.length,
          page: 1,
          limit: 12,
        }),
      });
    });
  });

  test("home page shows auction listings", async ({ page }) => {
    await page.goto("/");

    // Should show auction cards
    await expect(page.getByText("Digital Art #1")).toBeVisible();
  });

  test("can filter by status", async ({ page }) => {
    await page.goto("/");

    // Click on upcoming filter if available
    const upcomingFilter = page.getByRole("button", { name: /upcoming/i }).or(
      page.getByRole("tab", { name: /upcoming/i })
    );

    if (await upcomingFilter.isVisible()) {
      await upcomingFilter.click();

      // Should show upcoming auctions
      await expect(page.getByText("Pixel Art Collection")).toBeVisible();
    }
  });

  test("auction card shows key information", async ({ page }) => {
    await page.goto("/");

    // Find auction card
    const card = page.locator('[data-testid="auction-card"]').first().or(
      page.getByText("Digital Art #1").locator("..")
    );

    // Should show price
    await expect(page.getByText(/2\.5.*SOL/i).or(page.getByText("2.5"))).toBeVisible();
  });

  test("clicking auction card navigates to detail page", async ({ page }) => {
    // Mock single auction API
    await page.route("**/api/auctions/auction-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAuctions[0]),
      });
    });

    await page.goto("/");

    // Click on auction
    await page.getByText("Digital Art #1").click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/auction\/auction-1/);
  });
});

test.describe("Auction Detail Page", () => {
  const mockAuction = {
    id: "auction-detail-1",
    title: "Featured Artwork",
    description: "A detailed description of this amazing artwork",
    image_url: "https://example.com/featured.jpg",
    starting_price: 1.0,
    current_price: 3.0,
    status: "current",
    start_time: new Date(Date.now() - 3600000).toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    creator_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    bid_count: 8,
    bids: [
      {
        id: "bid-1",
        amount: 3.0,
        bidder_address: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB",
        created_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: "bid-2",
        amount: 2.5,
        bidder_address: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
        created_at: new Date(Date.now() - 1200000).toISOString(),
      },
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auctions/auction-detail-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAuction),
      });
    });
  });

  test("shows auction details", async ({ page }) => {
    await page.goto("/auction/auction-detail-1");

    await expect(page.getByText("Featured Artwork")).toBeVisible();
    await expect(page.getByText(/A detailed description/)).toBeVisible();
  });

  test("shows bid history", async ({ page }) => {
    await page.goto("/auction/auction-detail-1");

    // Should show bids
    await expect(page.getByText(/3\.0.*SOL/i).or(page.getByText("3.0"))).toBeVisible();
  });

  test("shows countdown timer for active auction", async ({ page }) => {
    await page.goto("/auction/auction-detail-1");

    // Should show time remaining
    await expect(
      page.getByText(/\d+[hmd]\s*\d*[ms]?/i).or(page.getByText(/remaining/i))
    ).toBeVisible();
  });
});
