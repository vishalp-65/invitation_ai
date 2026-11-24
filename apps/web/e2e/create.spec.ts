import { expect, test } from '@playwright/test';

/**
 * The create flow on a phone, up to the sign-in step (no account needed):
 * occasion → details (with the calendar, a common time and an extra function) → design → Create asks for a code.
 * Needs the API running too (designs load from it).
 */
test.describe('create an invitation', () => {
  test('occasion, details and design lead to sign-in', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => localStorage.removeItem('cardai-draft-v1'));
    await page.goto('/create');

    // Step 1: one tap on an occasion.
    await expect(page.getByRole('heading', { name: 'What are you celebrating?' })).toBeVisible();
    await page.getByRole('button', { name: /^Wedding/ }).first().click();

    // Step 2: details. "Choose design" is blocked until the names are in.
    await expect(page.getByRole('heading', { name: 'Add your details' })).toBeVisible();
    await page.getByRole('button', { name: 'Choose design' }).click();
    await expect(page.getByText('Required').first()).toBeVisible();

    await page.getByLabel('First name').fill('Rohan');
    await page.getByLabel('Second name').fill('Meera');
    await page.getByPlaceholder('e.g. Rambagh Palace').fill('Leela Palace');

    // Calendar: open, move a day with the keyboard, pick it.
    const dateField = page.getByLabel('Date', { exact: true });
    const before = await dateField.innerText();
    await dateField.click();
    await expect(page.getByRole('dialog', { name: 'Choose a date' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Choose a date' })).toBeHidden();
    await expect(dateField).not.toHaveText(before);

    // Time: one of the common times.
    await page.getByLabel('Time', { exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose a time' }).getByRole('button', { name: /8:00/ }).click();
    await expect(page.getByLabel('Time', { exact: true })).toContainText('8:00');

    // An extra function from the chips keeps the main day and venue.
    await page.getByRole('button', { name: 'Haldi' }).click();
    await expect(page.getByRole('heading', { name: 'Functions' })).toBeVisible();

    await page.getByRole('button', { name: 'Choose design' }).click();

    // Step 3: designs, then Create asks for a sign-in code (the draft is kept).
    await expect(page.getByRole('heading', { name: 'Choose your design' })).toBeVisible();
    await page.getByRole('button', { name: 'Create invitation' }).last().click();
    await expect(page.getByRole('dialog', { name: 'Get a code to save your invitation' })).toBeVisible();

    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('cardai-draft-v1') ?? '{}').state);
    expect(draft.names).toEqual(['Rohan', 'Meera']);
    expect(draft.functions).toHaveLength(2);
    expect(errors).toEqual([]);
  });
});
