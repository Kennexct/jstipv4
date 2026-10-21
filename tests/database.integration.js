import { test, expect } from '@playwright/test';
async function session(page, admin = false) {
  await page.addInitScript(
    ({ admin }) => {
      const id = admin
        ? '00000000-0000-0000-0000-000000000004'
        : '00000000-0000-0000-0000-000000000001';
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const jwt =
        btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) +
        '.' +
        btoa(JSON.stringify({ sub: id, exp, role: 'authenticated' })) +
        '.test';
      localStorage.setItem(
        'sb-127-auth-token',
        JSON.stringify({
          access_token: jwt,
          refresh_token: 'test',
          expires_at: exp,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id,
            email: admin ? 'admin@example.com' : 'owner@example.com',
            user_metadata: { name: admin ? 'Admin' : 'Owner' },
          },
        }),
      );
      localStorage.setItem(
        'jastip-ops-v1',
        JSON.stringify({ shop: { name: 'Old fake shop' }, orders: [{ name: 'Fake Buyer' }] }),
      );
    },
    { admin },
  );
}
test('clean workspace, trip/item capture, public order, payments, purchase, tracking and manual invoice use PostgreSQL', async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => console.log('Network failure', r.url(), r.failure()?.errorText));
  await session(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  await page.getByLabel('Workspace name').fill('Actual shop');
  await page.getByLabel('Storefront URL name').fill('actual-shop');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Jastip Ops' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Fake Buyer');
  await page.goto('/#Trips');
  await expect(page.getByText('Plan your first trip')).toBeVisible();
  await page.getByRole('button', { name: 'New trip', exact: true }).last().click();
  await page.getByLabel('Trip name').fill('Tokyo real trip');
  await page.getByLabel('Shopping destination').fill('Tokyo');
  await page.getByRole('button', { name: 'Create trip' }).click();
  await expect(page.getByRole('heading', { name: 'Tokyo real trip' })).toBeVisible();
  await page.getByLabel('Trip status').selectOption('Open for orders');
  await page.waitForTimeout(150);
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).first().click();
  await page.getByLabel('Item name').fill('Actual matcha');
  await page.getByLabel('Purchase price', { exact: true }).fill('3000');
  await page.getByLabel('Quantity', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Post item' }).click();
  await expect(page.getByRole('button', { name: 'Actual matcha', exact: true })).toBeVisible();
  const buyer = await browser.newPage();
  buyer.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('Buyer error', e.message);
  });
  await buyer.goto('http://127.0.0.1:3002/#Storefront/actual-shop');
  await buyer.getByRole('button', { name: /Actual matcha/ }).click();
  await buyer.getByRole('button', { name: 'Order this item' }).click();
  await buyer.getByLabel('Your name').fill('Actual Buyer');
  await buyer.getByLabel('WhatsApp number').fill('628123456789');
  await buyer.getByLabel('Delivery address').fill('Jakarta Indonesia');
  await buyer.getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'Place order' }).click();
  await expect(buyer.getByText('Private tracking token', { exact: true })).toBeVisible();
  const token = await buyer.locator('.private-token strong').innerText();
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await page.goto('/#Orders');
  await page.getByText('Actual Buyer', { exact: true }).click();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await page.getByLabel('Payment amount (IDR)').fill('100000');
  await page.getByRole('button', { name: 'Record payment', exact: true }).last().click();
  await expect(page.getByText('Rp 278.000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await page.getByRole('button', { name: 'Record payment', exact: true }).last().click();
  await expect(page.getByLabel('Update order status')).toHaveValue('Paid');
  await page.getByRole('button', { name: 'Close detail' }).click();
  await page.goto('/#Purchasing');
  await page.getByRole('checkbox').click();
  await page.getByLabel('Actual purchase cost per item').fill('300000');
  await page.getByRole('button', { name: 'Mark as purchased' }).click();
  await page.goto('/#Orders');
  await page.getByText('Actual Buyer', { exact: true }).click();
  await page.getByLabel('Update order status').selectOption('Shipped');
  await expect(page.getByLabel('Update order status')).toHaveValue('Shipped');
  await page.getByLabel('Update order status').selectOption('Delivered');
  await expect(page.getByLabel('Update order status')).toHaveValue('Delivered');
  await buyer.getByRole('button', { name: 'Keep browsing' }).click();
  await buyer.getByRole('button', { name: 'Track order', exact: true }).click();
  await buyer.getByLabel('Order code').fill(token);
  await buyer.getByRole('button', { name: 'Track order', exact: true }).last().click();
  await expect(buyer.getByRole('dialog').getByText('Delivered', { exact: true })).toBeVisible();
  await expect(buyer.getByRole('dialog')).not.toContainText('Actual Buyer');
  // No stock limit + 50% down payment; jastiper buys after the DP, ships after full payment.
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).first().click();
  await page.getByLabel('Item name').fill('Endless matcha');
  await page.getByLabel('Purchase price', { exact: true }).fill('1000');
  await page.getByLabel('No quantity limit').check();
  await page.getByLabel('Down payment type').selectOption('percent');
  await page.getByLabel('Down payment value').fill('50');
  await page.getByRole('button', { name: 'Post item' }).click();
  await expect(page.getByRole('button', { name: 'Endless matcha', exact: true })).toBeVisible();
  await buyer.goto('http://127.0.0.1:3002/#Storefront/actual-shop');
  await buyer.reload();
  await expect(buyer.getByRole('button', { name: 'Back to workspace' })).toHaveCount(0);
  await expect(buyer.getByRole('button', { name: 'Exit preview' })).toHaveCount(0);
  const card = buyer.locator('.store-product').filter({ hasText: 'Endless matcha' });
  await expect(card).toContainText('Ready to order');
  await expect(card).toContainText('DP 50%');
  await card.click();
  await buyer.getByLabel('Quantity').fill('2');
  await buyer.getByRole('button', { name: 'Order this item' }).click();
  await buyer.getByLabel('Your name').fill('DP Buyer');
  await buyer.getByLabel('WhatsApp number').fill('628123456700');
  await buyer.getByLabel('Delivery address').fill('Jakarta Indonesia');
  await buyer.getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'Place order' }).click();
  await expect(buyer.getByText('Down payment: Rp 126.000 to confirm this order.')).toBeVisible();
  await page.goto('/#Orders');
  await page.getByText('DP Buyer', { exact: true }).click();
  await page.getByLabel('Update order status').selectOption('Confirmed');
  await expect(page.getByLabel('Update order status')).toHaveValue('Confirmed');
  await page.getByRole('button', { name: 'Close detail' }).click();
  await page.goto('/#Purchasing');
  const dpRow = page.locator('.purchase-row').filter({ hasText: 'DP Buyer' });
  await expect(dpRow.getByText('DP due', { exact: true })).toBeVisible();
  await dpRow.getByRole('checkbox').click();
  await expect(page.getByRole('dialog')).toContainText('Down payment due');
  await page.getByLabel('Payment amount (IDR)').fill('126000');
  await page.getByRole('button', { name: 'Record payment', exact: true }).last().click();
  await expect(dpRow.getByText('DP paid', { exact: true })).toBeVisible();
  await dpRow.getByRole('checkbox').click();
  await page.getByLabel('Actual purchase cost per item').fill('100000');
  await page.getByRole('button', { name: 'Mark as purchased' }).click();
  await expect(dpRow.getByText('Purchased', { exact: true })).toBeVisible();
  await page.goto('/#Orders');
  await page.getByText('DP Buyer', { exact: true }).click();
  await page.getByLabel('Update order status').selectOption('Shipped');
  await expect(page.getByRole('dialog', { name: 'Record payment' })).toContainText(
    'Outstanding for',
  );
  await page.getByRole('button', { name: 'Record payment', exact: true }).last().click();
  await expect(
    page.getByRole('dialog', { name: /Order JO-/ }).getByText('Paid in full'),
  ).toBeVisible();
  await expect(page.getByLabel('Update order status')).toHaveValue('Purchased');
  await page.getByLabel('Update order status').selectOption('Shipped');
  await expect(page.getByLabel('Update order status')).toHaveValue('Shipped');
  await page.getByRole('button', { name: 'Close detail' }).click();
  await page.goto('/#Items');
  await expect(page.locator('body')).toContainText('Ready to order');
  const admin = await browser.newPage();
  await session(admin, true);
  await admin.goto('http://127.0.0.1:3002/#Merchants');
  await admin.getByText('Actual shop', { exact: true }).click();
  await admin.getByRole('button', { name: 'Record manual invoice' }).click();
  await admin.getByLabel('Verified payment amount (IDR)').fill('149000');
  await admin.getByLabel('Payment reference or note').fill('Verified transfer ref A123');
  await admin.getByRole('button', { name: 'Record verified payment' }).click();
  await page.goto('/#Billing');
  await expect(page.getByText('Rp 149.000', { exact: true }).last()).toBeVisible();
  await expect(page.locator('body')).toContainText('Paid');
  expect(errors).toEqual([]);
  await buyer.close();
  await admin.close();
});
