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
  'Inbox',
  'Audit',
  'Home',
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
  // Shipping asks for the courier and resi (ADR-008).
  await page.getByLabel('Resi for JO-1046').fill('jne0012345678');
  await page.getByRole('button', { name: 'Mark shipped' }).click();
  await page
    .getByRole('dialog', { name: 'Order shipped' })
    .getByRole('button', { name: 'Done' })
    .click();
  await expect(page.getByText('JNE0012345678')).toBeVisible();
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

test('landing page explains Bawa, shows example data and real plan prices', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#Home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your jastip business, in order.',
  );
  // Example rows are always labelled; the hero card uses the real margin calculation.
  await expect(page.getByText('Example data').first()).toBeVisible();
  await expect(page.locator('.lp-calc')).toContainText('Rp 1.586.000');
  await expect(page.locator('.lp-calc')).toContainText('12.7%');
  for (const tab of ['Orders', 'Purchasing', 'Storefront', 'Items']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
  }
  await page.getByRole('button', { name: 'Pricing', exact: true }).first().click();
  const plans = page.locator('#pricing article');
  await expect(plans).toHaveCount(3);
  await expect(plans.nth(0)).toContainText('Rp 49.000');
  await expect(plans.nth(1)).toContainText('Rp 149.000');
  await expect(plans.nth(2)).toContainText('Rp 399.000');
  // In-page links scroll without changing the route.
  expect(new URL(page.url()).hash).toBe('#Home');
  await page.getByText('Do my buyers need an account?').click();
  await expect(page.getByText(/Buyers order from your storefront link/)).toBeVisible();
  // The demo build has no account system, so Get started lands in the workspace.
  await page.getByRole('button', { name: 'Get started' }).first().click();
  await expect(page).toHaveURL(/#Overview$/);
  expect(errors).toEqual([]);
});
test('landing chat opens from the corner button and closes with Escape', async ({ page }) => {
  await page.goto('/#Home');
  const launcher = page.getByRole('button', { name: 'Open chat' });
  await expect(launcher).toBeVisible();
  const box = await launcher.boundingBox();
  const viewport = page.viewportSize();
  expect(box.x + box.width).toBeGreaterThan(viewport.width - 40);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 40);
  await launcher.click();
  const panel = page.getByRole('dialog', { name: 'Chat with Bawa' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('messages are not sent');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open chat' })).toBeFocused();
});
test('platform console has an Inbox for landing-page chats', async ({ page }) => {
  await page.goto('/#Metrics');
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();
  await expect(page.getByText('The inbox needs the live database')).toBeVisible();
});

test('message templates are saved once and used by every copy button', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Messages', exact: true }).click();
  await page.getByLabel('Bank', { exact: true }).fill('BCA');
  await page.getByLabel('Account number').fill('123 456 7890');
  await page.getByLabel('Account holder').fill('Rina');
  await page.getByLabel('Payment reminder').fill('Kak {nama}, sisa {sisa} ke {rekening} ya.');
  await expect(page.locator('.message-preview')).toContainText('BCA 123 456 7890 a.n. Rina');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Message templates saved.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Messages', exact: true }).click();
  await expect(page.getByLabel('Account holder')).toHaveValue('Rina');
  await page.goto('/#Orders');
  await page.getByText('Aditya Pratama', { exact: true }).click();
  await page.getByRole('button', { name: 'Payment reminder' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe('Kak Aditya, sisa Rp 425.000 ke BCA 123 456 7890 a.n. Rina ya.');
  await page.getByRole('button', { name: 'Copy quote' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^Halo Kak Aditya!/);
});
test('shipping records courier and resi, and buyers see them on the tracking link', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#Orders');
  await page.getByText('Dewi Anggraini', { exact: true }).click();
  await page.getByLabel('Update order status').selectOption('Shipped');
  const dialog = page.getByRole('dialog', { name: 'Mark as shipped' });
  await dialog.getByLabel('Courier').selectOption('J&T');
  await dialog.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(dialog.getByText('Enter the resi for JO-1044.')).toBeVisible();
  await dialog.getByLabel('Resi for JO-1044').fill('<bad>');
  await dialog.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(dialog.getByText(/letters, numbers and dashes/)).toBeVisible();
  await dialog.getByLabel('Resi for JO-1044').fill('jt0012345678');
  await dialog.getByRole('button', { name: 'Mark shipped' }).click();
  await page.getByRole('button', { name: 'Copy message' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'via J&T, resi JT0012345678',
  );
  await page
    .getByRole('dialog', { name: 'Order shipped' })
    .getByRole('button', { name: 'Done' })
    .click();
  await expect(page.locator('.details-list')).toContainText('J&T · JT0012345678');
  // A tracking link opens straight to the result.
  await page.goto('/#Storefront/demo/track/JO-1044');
  const tracking = page.getByRole('dialog');
  await expect(tracking.getByText('Your order is shipped')).toBeVisible();
  await expect(tracking.locator('.tracking-shipment')).toContainText('JT0012345678');
});
test('bulk actions copy one reminder per unpaid buyer and skip orders that cannot ship', async ({
  page,
}) => {
  await page.goto('/#Orders');
  for (const id of ['JO-1048', 'JO-1047', 'JO-1046', 'JO-1044'])
    await page.getByLabel('Select ' + id).check();
  await page.getByRole('button', { name: 'Copy reminders' }).click();
  const reminders = page.getByRole('dialog', { name: /Payment reminders/ });
  await expect(reminders.locator('.ops-list li')).toHaveCount(2);
  await expect(reminders).toContainText('2 selected orders are already paid');
  await reminders.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Mark shipped' }).click();
  const ship = page.getByRole('dialog', { name: 'Mark as shipped' });
  await expect(ship.locator('.ship-row')).toHaveCount(1);
  await expect(ship.locator('.ship-skipped li')).toHaveCount(3);
  await expect(ship.locator('.ship-skipped')).toContainText('Not purchased yet');
});
test('post and add another keeps the trip and markup and clears the item', async ({ page }) => {
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByLabel('Item name').fill('Yuzu hand cream');
  await page.getByLabel('Purchase price', { exact: true }).fill('1500');
  await page.getByLabel('Markup', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Post and add another' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Item name')).toHaveValue('');
  await expect(dialog.getByLabel('Item name')).toBeFocused();
  await expect(dialog.getByLabel('Markup', { exact: true })).toHaveValue('35');
  await dialog.getByLabel('Item name').fill('Sakura lip balm');
  await dialog.getByLabel('Purchase price', { exact: true }).fill('800');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Yuzu hand cream', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sakura lip balm', exact: true })).toBeVisible();
});
