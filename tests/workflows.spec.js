import { test, expect } from '@playwright/test';
const pages = [
  'Overview',
  'Orders',
  'Requests',
  'Items',
  'Trips',
  'Purchasing',
  'Customers',
  'Reports',
  'Settings',
  'Billing',
  'Welcome',
  'Storefront',
  'Metrics',
  'Merchants',
  'Moderation',
  'Audit',
];
test('all workspaces render without runtime errors or horizontal overflow', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1440, 1024, 820, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of pages) {
      await page.goto('/#' + route);
      await expect(page.locator('h1')).toBeVisible();
      await page.waitForTimeout(30);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${route} at ${width}px`).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});
test('public order flows into seller workspace and partial payment persists', async ({ page }) => {
  await page.goto('/#Storefront');
  await page.getByRole('button', { name: /Hada Labo/ }).click();
  await page.getByRole('button', { name: 'Order this item' }).click();
  await page.getByLabel('Your name').fill('Test Buyer');
  await page.getByLabel('WhatsApp number').fill('628123456789');
  await page.getByLabel('Delivery address').fill('Jakarta, Indonesia');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByText('JO-1049', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep browsing' }).click();
  await page.goto('/#Orders');
  await page.getByText('Test Buyer', { exact: true }).click();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByLabel('Payment amount (IDR)').fill('100000');
  await page.getByRole('button', { name: 'Record payment', exact: true }).last().click();
  await expect(page.getByText('Rp 49.000', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('Test Buyer', { exact: true }).click();
  await expect(page.getByText('Rp 49.000', { exact: true })).toBeVisible();
});
test('paid order captures actual purchase cost, reaches delivery and public tracking', async ({
  page,
}) => {
  await page.goto('/#Purchasing');
  const row = page.locator('.purchase-row').filter({ hasText: 'Sinta' });
  await row.getByRole('checkbox').click();
  await page.getByLabel('Actual purchase cost per item').fill('100000');
  await page.getByRole('button', { name: 'Mark as purchased' }).click();
  await page.goto('/#Orders');
  await page.getByText('Sinta Maharani', { exact: true }).click();
  await expect(page.getByText('Rp 87.000', { exact: true })).toBeVisible();
  await page.getByLabel('Update order status').selectOption('Shipped');
  await page.getByLabel('Update order status').selectOption('Delivered');
  await page.getByRole('button', { name: 'Close detail' }).click();
  await page.goto('/#Storefront');
  await page.getByRole('button', { name: 'Track order', exact: true }).click();
  await page.getByLabel('Order code').fill('JO-1046');
  await page.getByRole('button', { name: 'Track order', exact: true }).last().click();
  await expect(page.getByRole('dialog').getByText('Delivered', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('Margin');
});
test('item capture uses the PRD calculator and saves an editable product', async ({ page }) => {
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByLabel('Item name').fill('Kyoto matcha gift');
  await page.getByLabel('Purchase price', { exact: true }).fill('3000');
  await page.getByLabel('Markup', { exact: true }).fill('20');
  await expect(page.getByRole('dialog').getByText('Rp 378.000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Post item' }).click();
  await expect(page.getByRole('button', { name: 'Kyoto matcha gift', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Kyoto matcha gift', exact: true })).toBeVisible();
});
test('appearance settings persist and read-only support prevents mutations', async ({ page }) => {
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  for (const accent of ['indigo', 'blue', 'violet', 'teal', 'rose', 'graphite']) {
    await page.getByRole('button', { name: accent + ' accent' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-accent', accent);
  }
  await page.getByLabel('Density').selectOption('compact');
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.goto('/#Merchants');
  await page.getByText('Tokyo with Tia', { exact: true }).click();
  await page.getByRole('button', { name: 'Extend trial by 7 days' }).click();
  await expect(page.getByRole('dialog')).toContainText('21 days');
  await page.getByRole('button', { name: 'Open read-only support view' }).click();
  await expect(page.locator('.support-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByLabel('Item name').fill('Blocked support edit');
  await page.getByRole('button', { name: 'Post item' }).click();
  await expect(page.locator('.form-error')).toContainText('read-only');
  const found = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('jastip-ops-demo-v1')).items.some(
      (i) => i.name === 'Blocked support edit',
    ),
  );
  expect(found).toBe(false);
});
test('storefront highlights trips and has no workspace bar for customers', async ({ page }) => {
  await page.goto('/#Storefront');
  const trips = page.getByRole('region', { name: 'Current trips' });
  await expect(trips.getByText('Tokyo autumn trip')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tokyo autumn trip' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to workspace' })).toHaveCount(0);
  await trips.getByRole('button', { name: /Tokyo autumn trip/ }).click();
  await expect(trips.getByRole('button', { name: /Tokyo autumn trip/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('confirmed orders can be bought before full payment and recapped', async ({ page }) => {
  await page.goto('/#Purchasing');
  const row = page.locator('.purchase-row').filter({ hasText: 'Aditya' });
  await expect(row.getByText('Confirmed', { exact: true })).toBeVisible();
  await row.getByRole('checkbox').click();
  await page.getByLabel('Actual purchase cost per item').fill('90000');
  await page.getByRole('button', { name: 'Mark as purchased' }).click();
  await expect(row.getByText('Purchased', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Recap by item', exact: true }).click();
  await expect(page.locator('table')).toContainText('Matcha ceremonial blend');
});
test('items without a quantity limit and with a down payment reach the storefront', async ({
  page,
}) => {
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByLabel('Item name').fill('Endless KitKat box');
  await page.getByLabel('No quantity limit').check();
  await page.getByLabel('Down payment type').selectOption('percent');
  await page.getByLabel('Down payment value').fill('50');
  await page.getByRole('button', { name: 'Post item' }).click();
  await page.goto('/#Storefront');
  const card = page.locator('.store-product').filter({ hasText: 'Endless KitKat box' });
  await expect(card).toContainText('Ready to order');
  await expect(card).toContainText('DP 50%');
  await card.click();
  await expect(page.getByRole('dialog')).toContainText('up to 20 per order');
});
test('trips show their status and can be filtered by open, planning or closed', async ({
  page,
}) => {
  await page.goto('/#Trips');
  const cards = page.locator('.trip-selector > button');
  await expect(cards.filter({ hasText: 'Tokyo autumn trip' })).toContainText('Open for orders');
  await expect(cards.filter({ hasText: 'Seoul beauty run' })).toContainText('Planning');
  await page.getByRole('button', { name: /^Closed/ }).click();
  await expect(cards.filter({ hasText: 'Tokyo autumn trip' })).toHaveCount(0);
  await expect(cards.first()).toContainText('Closed');
  await expect(page.getByLabel('Trip status')).toHaveValue('Closed');
  await page.getByRole('button', { name: /^Active/ }).click();
  await expect(cards.filter({ hasText: 'Closed' })).toHaveCount(0);
});
test('unsaved changes ask before leaving a form, dialog or settings tab', async ({ page }) => {
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByLabel('Item name').fill('Half-typed find');
  await page.keyboard.press('Escape');
  const confirm = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Item name')).toHaveValue('Half-typed find');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await confirm.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByLabel('Item name')).toHaveCount(0);

  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Currency', exact: true }).click();
  const rate = page.getByLabel('JPY exchange rate');
  await rate.fill('110');
  await expect(page.getByRole('region', { name: 'Unsaved changes' })).toBeVisible();
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: /^Orders/ })
    .click();
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Exchange rates saved.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Unsaved changes' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('JPY exchange rate')).toHaveValue('110');
});
test('page changes show the top loading bar and finished walkthroughs are hidden', async ({
  page,
}) => {
  await page.goto('/#Overview');
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: /^Orders/ })
    .click();
  await expect(page.getByRole('progressbar', { name: 'Loading page' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Loading page' })).toHaveCount(0);
  await page.locator('.workspace-switch').click();
  await expect(page.getByRole('dialog')).not.toContainText('Start the walkthrough');
});
test('storefront layouts and colours can be chosen, previewed and saved', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await page.getByRole('radio', { name: /Lookbook/ }).click();
  await page.getByRole('radio', { name: 'orange storefront colour' }).click();
  await expect(page.locator('.store-preview-frame .storefront')).toHaveClass(/store-lookbook/);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Storefront settings saved.')).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const layout of ['Lookbook', 'Trip showcase', 'Marketplace']) {
      await page.goto('/#Settings');
      await page.getByRole('button', { name: 'Storefront', exact: true }).click();
      await page.getByRole('radio', { name: new RegExp(layout) }).click();
      const save = page.getByRole('button', { name: 'Save changes' });
      if (await save.isVisible()) {
        await save.click();
        await expect(save).toHaveCount(0);
      }
      await page.goto('/#Storefront');
      await expect(page.locator('.storefront').first()).toBeVisible();
      await expect(page.locator('.store-product').first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, `${layout} at ${width}px`).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});
test('a trip can sell in another currency and totals switch by currency', async ({ page }) => {
  await page.goto('/#Trips');
  await page.getByRole('button', { name: 'New trip', exact: true }).first().click();
  await page.getByLabel('Trip name').fill('Tokyo for Singapore');
  await page.getByLabel('Shopping destination').fill('Tokyo');
  await page.getByLabel('Selling currency').selectOption('SGD');
  await page.getByRole('button', { name: 'Create trip' }).click();
  await expect(page.getByText('Sell in SGD')).toBeVisible();
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Trip', { exact: true })
    .selectOption({ label: 'Tokyo for Singapore' });
  await page.getByLabel('Item name').fill('Singapore Kit Kat');
  await page.getByLabel('Purchase price', { exact: true }).fill('3000');
  await expect(page.getByRole('dialog')).toContainText('S$');
  await page.getByRole('button', { name: 'Post item' }).click();
  const item = page.locator('.item-card').filter({ hasText: 'Singapore Kit Kat' });
  await expect(item).toContainText('S$');
  await page.goto('/#Overview');
  await expect(page.getByLabel('Show totals in currency')).toBeVisible();
  await page.getByLabel('Show totals in currency').selectOption('SGD');
  await expect(page.locator('.stat-strip')).toContainText('S$');
});
test('dashboard accent colour and tinted style personalize the workspace', async ({ page }) => {
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'emerald accent' }).click();
  await page.getByRole('radio', { name: 'Tinted' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'emerald');
  await expect(page.locator('html')).toHaveAttribute('data-tint', 'tinted');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tint', 'tinted');
});

test('Bawa brand shows in the app and the Forest accent follows light, dark and system themes', async ({
  page,
}) => {
  await page.goto('/#Overview');
  await expect(page).toHaveTitle(/^Bawa · /);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    /favicon\.svg$/,
  );
  await expect(page.locator('.sidebar .brand').getByRole('img', { name: 'Bawa' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/jastip ops/i);
  const accent = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    );
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('button', { name: 'forest accent' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'forest');
  expect(await accent()).toMatch(/#1f6b4f/i);
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  expect(await accent()).toMatch(/#c6f26b/i);
  // System theme in a dark OS uses the dark accent value (was a bug before ADR-005).
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
  expect(await accent()).toMatch(/#c6f26b/i);
  await page.getByRole('button', { name: 'blue accent' }).click();
  expect(await accent()).toMatch(/#81aee0/i);
  await page.goto('/#Storefront');
  await expect(page.locator('.store-powered').getByRole('img', { name: 'Bawa' })).toBeVisible();
});

test('product photos show a preview, including files without a MIME type (Android app)', async ({
  page,
}) => {
  // 1×1 red PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const input = page.getByLabel('Product photos');
  await expect(input).not.toHaveAttribute('capture', /.*/);
  await input.setInputFiles({ name: 'camera.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Uploaded product' })).toBeVisible();
  await input.setInputFiles({ name: 'content-uri', mimeType: '', buffer: png });
  await expect(page.getByRole('button', { name: 'Remove photo 2' })).toBeVisible();
  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hi'),
  });
  await expect(page.getByRole('dialog')).toContainText('Choose an image file');
});
