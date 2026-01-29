import { test, expect } from "@playwright/test";

test.describe("Error States", () => {
  test("shows 404 page for non-existent route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");

    // Should show 404 content
    await expect(
      page.getByText(/404/i).or(page.getByText(/not found/i)).or(page.getByText(/page.*exist/i))
    ).toBeVisible();

    // Should have link back to home
    await expect(
      page.getByRole("link", { name: /home/i }).or(page.getByRole("link", { name: /back/i }))
    ).toBeVisible();
  });

  test("shows 404 for non-existent auction", async ({ page }) => {
    // Mock 404 response
    await page.route("**/api/auctions/non-existent-auction", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Auction not found" }),
      });
    });

    await page.goto("/auction/non-existent-auction");

    // Should show not found message
    await expect(
      page.getByText(/not found/i).or(page.getByText(/doesn't exist/i)).or(page.getByText(/404/i))
    ).toBeVisible();
  });

  test("handles API error gracefully", async ({ page }) => {
    // Mock server error
    await page.route("**/api/auctions*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/");

    // Should show error state or fallback
    await expect(
      page.getByText(/error/i).or(page.getByText(/something went wrong/i)).or(page.getByText(/try again/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows loading state while fetching", async ({ page }) => {
    // Delay API response
    await page.route("**/api/auctions*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ auctions: [], total: 0 }),
      });
    });

    await page.goto("/");

    // Should show loading indicator
    await expect(
      page.getByText(/loading/i).or(page.locator('[data-testid="loading"]')).or(
        page.locator(".animate-pulse")
      )
    ).toBeVisible();
  });

  test("handles network timeout", async ({ page }) => {
    // Abort the request to simulate timeout
    await page.route("**/api/auctions*", async (route) => {
      await route.abort("timedout");
    });

    await page.goto("/");

    // Should show error or retry option
    await expect(
      page.getByText(/error/i).or(page.getByText(/failed/i)).or(page.getByRole("button", { name: /retry/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Form Validation Errors", () => {
  test("shows validation error for empty bid", async ({ page }) => {
    const mockAuction = {
      id: "validation-test",
      title: "Validation Test Auction",
      status: "current",
      current_price: 1.0,
      minimum_increment: 0.1,
      start_time: new Date(Date.now() - 3600000).toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      creator_address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    };

    await page.route("**/api/auctions/validation-test", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAuction),
      });
    });

    // Inject wallet
    await page.addInitScript(`
      window.__MOCK_WALLET__ = { publicKey: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB", connected: true };
      window.__AUTH_OVERRIDE__ = { isAuthenticated: true, user: { wallet_address: "7nYmDMGTsQpfh8HqpLUJvE9oVPh3LnJbqKWPnk4JJvZB" } };
    `);

    await page.goto("/auction/validation-test");

    // Try to submit without filling bid
    const bidButton = page.getByRole("button", { name: /place bid/i });

    if (await bidButton.isVisible()) {
      await bidButton.click();

      // Should show validation error or button should be disabled
      const hasError = await page.getByText(/required/i).or(page.getByText(/enter/i)).isVisible();
      const isDisabled = await bidButton.isDisabled();

      expect(hasError || isDisabled).toBeTruthy();
    }
  });
});

test.describe("Rate Limiting", () => {
  test("shows rate limit error after too many requests", async ({ page }) => {
    let requestCount = 0;

    await page.route("**/api/auctions*", async (route) => {
      requestCount++;

      if (requestCount > 5) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "Too many requests. Please try again later." }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ auctions: [], total: 0 }),
        });
      }
    });

    // Make multiple requests
    for (let i = 0; i < 6; i++) {
      await page.goto("/");
    }

    // Should show rate limit message
    await expect(
      page.getByText(/too many/i).or(page.getByText(/rate limit/i)).or(page.getByText(/try again/i))
    ).toBeVisible({ timeout: 10000 });
  });
});
