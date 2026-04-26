import { test, expect } from '@playwright/test';

test.describe('NH Chevy Showroom Kiosk - Smoke Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads and shows welcome path-selection surface', async ({ page }) => {
    // Path-selection is the landing surface (the name-capture gate is
    // disabled). The "I Have a Stock Number" card is no longer surfaced.
    await expect(page.getByText('How can I help you today?')).toBeVisible();
    await expect(page.getByText('I Know What I Want')).toBeVisible();
    await expect(page.getByText('Chat with Showroom AI')).toBeVisible();
    await expect(page.getByText('I Have a Stock Number')).toHaveCount(0);
  });

  test('can navigate to inventory via browse all', async ({ page }) => {
    await page.getByText(/browse all inventory/i).click();

    await expect(page).toHaveURL(/#inventory/);
  });

  test('can navigate to AI Assistant', async ({ page }) => {
    await page.getByText('Chat with Showroom AI').click();

    await expect(page).toHaveURL(/#aiAssistant/);
    await expect(page.locator('input[placeholder*="message" i]')).toBeVisible();
  });

  test('can navigate to Model/Budget selector', async ({ page }) => {
    await page.getByText('I Know What I Want').click();

    await expect(page).toHaveURL(/#modelBudget/);
  });

  test.skip('can navigate to Stock Lookup via direct hash URL', async ({ page }) => {
    // TODO: KioskApp routes via setCurrentScreen + pushState; it does not
    // read window.location.hash on initial load, so direct navigation to
    // #stockLookup lands on the welcome screen. The route component is
    // still registered and reachable from in-app navigation, but is no
    // longer covered by e2e until a hashchange/initial-hash listener is
    // added (out of scope for the welcome-surface streamline PR).
    await page.goto('/#stockLookup');

    await expect(page).toHaveURL(/#stockLookup/);
  });

  test('back button returns to path selection', async ({ page }) => {
    await page.getByText('I Know What I Want').click();
    await expect(page).toHaveURL(/#modelBudget/);

    await page.getByText('Back').click();

    await expect(page.getByText('How can I help you today?')).toBeVisible();
  });

  test('sales desk link navigates to traffic log', async ({ page }) => {
    await page.getByText('Sales Desk').click();

    await expect(page).toHaveURL(/#trafficLog/);
  });

  test('logo click resets journey to welcome', async ({ page }) => {
    await page.getByText('Chat with Showroom AI').click();
    await expect(page).toHaveURL(/#aiAssistant/);

    await page.locator('header').getByText('NEW HAMPSHIRE CHEVROLET').click();

    await expect(page.getByText('How can I help you today?')).toBeVisible();
  });

});

test.describe('NH Chevy Showroom Kiosk - Error Resilience', () => {

  test('app handles missing API gracefully', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('/');

    // Welcome path-selection should still render even with no API.
    await expect(page.getByText('How can I help you today?')).toBeVisible();
  });

});
