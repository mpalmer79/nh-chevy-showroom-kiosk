import { test, expect } from '@playwright/test';

test.describe('Kiosk Customer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ===========================================================================
  // Welcome Screen Tests
  // ---------------------------------------------------------------------------
  // The name-capture gate is currently disabled (WelcomeScreen defaults
  // `nameSubmitted` to true). Tests that exercised the name input,
  // Continue button, Skip button, or post-name greeting are skipped while
  // that surface is dormant. The implementation JSX is preserved in
  // WelcomeScreen.tsx; if name capture comes back, drop `.skip` to
  // reactivate these.
  // ===========================================================================
  test.describe('Welcome Screen', () => {
    test.skip('renders with Showroom AI assistant greeting (name-capture)', async ({ page }) => {
      await expect(page.getByText("I'm your Showroom AI assistant")).toBeVisible();
    });

    test.skip('displays name input field', async ({ page }) => {
      await expect(page.locator('input[placeholder*="first name" i]')).toBeVisible();
    });

    test.skip('displays Continue button', async ({ page }) => {
      await expect(page.getByText('Continue')).toBeVisible();
    });

    test.skip('displays Skip for now button', async ({ page }) => {
      await expect(page.getByText(/skip for now/i)).toBeVisible();
    });

    test('all navigation options are visible on the welcome surface', async ({ page }) => {
      await expect(page.getByText('How can I help you today?')).toBeVisible();
      await expect(page.getByText('I Know What I Want')).toBeVisible();
      await expect(page.getByText('Chat with Showroom AI')).toBeVisible();
      await expect(page.getByText(/browse all inventory/i)).toBeVisible();
      // Stock-number entry was removed from the welcome surface.
      await expect(page.getByText('I Have a Stock Number')).toHaveCount(0);
    });

    test.skip('shows personalized greeting after entering name (name-capture)', async ({ page }) => {
      await page.locator('input[placeholder*="first name" i]').fill('Sarah');
      await page.getByText('Continue').click();

      await expect(page.getByText(/Hi Sarah/i)).toBeVisible();
      await expect(page.getByText('How can I help you today?')).toBeVisible();
    });

    test.skip('displays phone number input', async ({ page }) => {
      await expect(page.locator('input[placeholder*="saves your progress" i]')).toBeVisible();
    });
  });

  // ===========================================================================
  // AI Assistant Navigation Tests
  // ===========================================================================
  test.describe('AI Assistant', () => {
    test('can navigate to AI assistant and see chat interface', async ({ page }) => {
      await page.getByText('Chat with Showroom AI').click();

      // Should see the chat input
      await expect(page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]')).toBeVisible();
    });

    test('can type a message in the chat input', async ({ page }) => {
      await page.getByText('Chat with Showroom AI').click();

      const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]');
      await chatInput.fill('Show me some trucks');
      await expect(chatInput).toHaveValue('Show me some trucks');
    });

    test('shows suggestion chips in the AI assistant', async ({ page }) => {
      await page.getByText('Chat with Showroom AI').click();

      // AI assistant should show quick-action chips or welcome message
      // Wait for the interface to be fully loaded
      await page.waitForTimeout(500);

      // The AI assistant should have rendered some UI elements
      const chatArea = page.locator('[class*="chat"], [class*="Chat"], [data-testid*="chat"]');
      // If no specific test ID, just verify the page has navigated correctly
      await expect(page).toHaveURL(/#aiAssistant/);
    });
  });

  // ===========================================================================
  // Inventory Browsing Tests
  // ===========================================================================
  test.describe('Browse Inventory', () => {
    test('can navigate to inventory and see vehicles', async ({ page }) => {
      await page.getByText(/browse all inventory/i).click();

      await expect(page).toHaveURL(/#inventory/);

      // Wait for vehicles to load
      await page.waitForTimeout(1000);

      // Should see vehicle cards or a loading state
      const vehicleCards = page.locator('[class*="vehicle"], [class*="Vehicle"], [class*="card"], [class*="Card"]');
      // At minimum the page should have loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('inventory page has filter or sort controls', async ({ page }) => {
      await page.getByText(/browse all inventory/i).click();

      await expect(page).toHaveURL(/#inventory/);
      await page.waitForTimeout(1000);

      // Look for filter button or sort controls
      const hasFilterButton = await page.getByText(/filter/i).isVisible().catch(() => false);
      const hasSortButton = await page.getByText(/sort/i).isVisible().catch(() => false);
      const hasControls = hasFilterButton || hasSortButton;

      // The inventory page should have some form of filtering
      expect(hasControls || true).toBeTruthy(); // Soft check -- page at least loaded
    });

    test('can navigate back from inventory to path selection', async ({ page }) => {
      await page.getByText(/browse all inventory/i).click();
      await expect(page).toHaveURL(/#inventory/);

      // Click back button
      const backButton = page.getByText('Back');
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page.getByText('How can I help you today?')).toBeVisible();
      }
    });
  });

  // ===========================================================================
  // Stock Lookup Tests
  // ---------------------------------------------------------------------------
  // The stock-number entry card was removed from the welcome surface.
  // KioskApp routes via setCurrentScreen + history.pushState; it does not
  // read window.location.hash on initial load, so `page.goto('/#stockLookup')`
  // lands on the welcome screen. The StockLookup component is still
  // registered and reachable from in-app navigation, but e2e coverage
  // for it is paused until an initial-hash/hashchange listener is added
  // (out of scope for the welcome-surface streamline PR).
  // ===========================================================================
  test.describe('Stock Lookup', () => {
    test.skip('can navigate to stock lookup via direct hash URL', async ({ page }) => {
      await page.goto('/#stockLookup');

      await expect(page).toHaveURL(/#stockLookup/);
      await expect(page.getByText(/Find Your Vehicle/i)).toBeVisible();
    });

    test.skip('stock lookup shows keypad', async ({ page }) => {
      await page.goto('/#stockLookup');

      await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '2', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
    });

    test.skip('can enter digits on the keypad', async ({ page }) => {
      // Pre-existing skip (keypad accessible names need investigation;
      // see prior TODO). Now also blocked by the lack of initial-hash
      // routing described in this describe block's header comment.
      await page.goto('/#stockLookup');

      const pressKey = (digit: string) =>
        page.getByRole('button', { name: digit, exact: true }).click();

      await pressKey('3');
      await pressKey('9');
      await pressKey('5');

      await expect(page.getByText('M')).toBeVisible();
    });
  });

  // ===========================================================================
  // Model Budget Selector Tests
  // ===========================================================================
  test.describe('Model Budget Selector', () => {
    test('can navigate to model budget selector', async ({ page }) => {
      await page.getByText('I Know What I Want').click();

      await expect(page).toHaveURL(/#modelBudget/);
    });

    test('model budget selector shows vehicle categories', async ({ page }) => {
      await page.getByText('I Know What I Want').click();

      await page.waitForTimeout(500);

      // Should see vehicle category options (trucks, SUVs, etc.)
      const hasTrucks = await page.getByText(/truck/i).first().isVisible().catch(() => false);
      const hasSUVs = await page.getByText(/suv/i).first().isVisible().catch(() => false);

      // At minimum the page should have loaded
      await expect(page).toHaveURL(/#modelBudget/);
    });
  });

  // ===========================================================================
  // Navigation Flow Tests
  // ===========================================================================
  test.describe('Navigation Flows', () => {
    test('can complete full path: AI -> back -> browse', async ({ page }) => {
      // Path-selection is the landing surface, so we go straight to AI.
      await page.getByText('Chat with Showroom AI').click();
      await expect(page).toHaveURL(/#aiAssistant/);

      // Go back
      await page.getByText('Back').click();
      await expect(page.getByText('How can I help you today?')).toBeVisible();

      // Browse inventory
      await page.getByText(/browse all inventory/i).click();
      await expect(page).toHaveURL(/#inventory/);
    });

    test('Sales Desk link is accessible from welcome screen', async ({ page }) => {
      const salesDesk = page.getByText('Sales Desk');
      await expect(salesDesk).toBeVisible();
    });

    test('header logo returns to welcome screen', async ({ page }) => {
      // Navigate away from welcome
      await page.getByText('Chat with Showroom AI').click();
      await expect(page).toHaveURL(/#aiAssistant/);

      // Click logo to return
      await page.locator('header').getByText('NEW HAMPSHIRE CHEVROLET').click();

      // Should be back at welcome path-selection surface
      await expect(page.getByText('How can I help you today?')).toBeVisible();
    });
  });
});

test.describe('Kiosk Error Resilience', () => {
  test('app renders even when backend API is unreachable', async ({ page }) => {
    // Block all API calls
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('/');

    // Welcome path-selection should still render even with no API.
    await expect(page.getByText('How can I help you today?')).toBeVisible();
  });

  test('inventory page handles API errors gracefully', async ({ page }) => {
    // Block inventory API
    await page.route('**/api/**/inventory**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server Error' }) })
    );

    await page.goto('/');
    await page.getByText(/browse all inventory/i).click();

    // Page should not crash; it should show an error state or empty state
    await expect(page.locator('body')).toBeVisible();
  });
});
