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
  await page.getByLabel('Actual purchase cost per item (IDR)').fill('100000');
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
