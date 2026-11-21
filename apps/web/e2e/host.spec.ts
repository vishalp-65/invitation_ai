import { expect, test } from '@playwright/test';

/** Host flows need a signed-in session and an invitation it owns (see playwright.config.ts). */
const state = process.env.E2E_STORAGE_STATE;
const eventId = process.env.E2E_EVENT_ID;
test.skip(!state || !eventId, 'Set E2E_STORAGE_STATE and E2E_EVENT_ID for host flows');
test.use({ storageState: state });

test('guests tab: add a guest, see the send lists', async ({ page }) => {
  await page.goto(`/dashboard/events/${eventId}?tab=guests`);
  await page.getByRole('button', { name: /add guests/i }).first().click();
  const name = `E2E Guest ${Date.now()}`;
  await page.getByLabel('Name').fill(name);
  await page.getByLabel(/mobile/i).first().fill('9811111111');
  await page.getByRole('button', { name: 'Add guest' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /not sent yet/i })).toBeEnabled();
});

test('replies tab shows caterer totals and the print list opens', async ({ page }) => {
  await page.goto(`/dashboard/events/${eventId}?tab=rsvp`);
  await expect(page.getByText('For the caterer')).toBeVisible();
  await page.goto(`/host/${eventId}/print`);
  await expect(page.getByRole('button', { name: /print/i })).toBeVisible();
});

test('co-hosts tab lists the invite form for the owner', async ({ page }) => {
  await page.goto(`/dashboard/events/${eventId}?tab=family`);
  await expect(page.getByRole('button', { name: /add co-host/i })).toBeVisible();
});

test('check-in page searches the guest list', async ({ page }) => {
  await page.goto(`/dashboard/events/${eventId}/checkin`);
  await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible();
  await page.getByLabel('Search guests').fill('E2E');
});
