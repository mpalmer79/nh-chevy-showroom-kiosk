import { test, expect } from '@playwright/test';

test.describe('NH Chevy Showroom Kiosk - Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads and shows welcome screen', async ({ page }) => {
    await expect(page.getByText("I'm your Showroom AI assistant")).toBeVisible();
    await expect(page.locator('input[placeholder*="first name" i]')).toBeVisible();
  });

  test('can skip name and see path selection', async ({ page }) => {
    await page.getByText(/skip/i).click();
    
    await expect(page.getByText('How can I help you today?')).toBeVisible();
    await expect(page.getByText('I Have a Stock Number')).toBeVisible();
    await expect(page.getByText('I Know What I Want')).toBeVisible();
    await expect(page.getByText('Chat with Showroom AI')).toBeVisible();
  });

  test('can enter name and see personalized greeting', async ({ page }) => {
    await page.locator('input[placeholder*="first name" i]').fill('TestUser');
    await page.getByText('Continue').click();
    
    await expect(page.getByText(/Hi TestUser/i)).toBeVisible();
  });

  test('can navigate to inventory via browse all', async ({ page }) => {
    await page.getByText(/skip/i).click();
    await page.getByText(/browse all inventory/i).click();
    
    await expect(page).toHaveURL(/#inventory/);
  });

  test('can navigate to AI Assistant', async ({ page }) => {
    await page.getByText(/skip/i).click();
    await page.getByText('Chat with Showroom AI').click();
    
    await expect(page).toHaveURL(/#aiAssistant/);
    await expect(page.locator('input[placeholder*="message" i]')).toBeVisible();
  });

  test('can navigate to Model/Budget selector', async ({ page }) => {
    await page.getByText(/skip/i).click();
    await page.getByText('I Know What I Want').click();
    
    await expect(page).toHaveURL(/#modelBudget/);
  });

  test('can navigate to Stock Lookup', async ({ page }) => {
    await page.getByText(/skip/i).click();
    await page.getByText('I Have a Stock Number').click();
    
    await expect(page).toHaveURL(/#stockLookup/);
  });

  test('back button returns to path selection', async ({ page }) => {
    await page.getByText(/skip/i).click();
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
    await page.getByText(/skip/i).click();
    await page.getByText('Chat with Showroom AI').click();
    await expect(page).toHaveURL(/#aiAssistant/);
    
    await page.locator('header').getByText('NH CHEVY').click();
    
    await expect(page.locator('input[placeholder*="first name" i]')).toBeVisible();
  });

});

test.describe('NH Chevy Showroom Kiosk - Error Resilience', () => {

  test('app handles missing API gracefully', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());
    
    await page.goto('/');
    
    await expect(page.getByText("I'm your Showroom AI assistant")).toBeVisible();
  });

});
