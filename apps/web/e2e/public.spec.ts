import { expect, test } from '@playwright/test';

test.describe('public pages', () => {
  test('home page loads without errors and leads to create', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    const cta = page.locator('a[href^="/create"]').first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/create/);
    expect(errors).toEqual([]);
  });

  test('pricing page shows plans in rupees', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('₹').first()).toBeVisible();
  });

  test('an unknown invitation shows a friendly not-found page', async ({ page }) => {
    // The loading screen streams first, so Next answers 200 and marks the page noindex.
    await page.goto('/i/this-invite-does-not-exist-e2e');
    await expect(page).toHaveTitle(/not found/i);
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});

test.describe('guest view', () => {
  const slug = process.env.E2E_INVITE_SLUG;
  test.skip(!slug, 'Set E2E_INVITE_SLUG to a published invitation');

  test('opens the invitation and shows the RSVP form', async ({ page }) => {
    await page.goto(`/i/${slug}`);
    // The opening (envelope / curtain) has a button; tap through it when present.
    const open = page.getByRole('button', { name: /open/i }).first();
    if (await open.isVisible().catch(() => false)) await open.click();
    await expect(page.locator('[data-section]').first()).toBeVisible();
  });
});
