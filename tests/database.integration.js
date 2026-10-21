import { test, expect } from '@playwright/test';
async function session(page, admin = false, helper = false) {
  await page.addInitScript(
    ({ admin, helper }) => {
      const id = helper
        ? '00000000-0000-0000-0000-000000000005'
        : admin
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
            email: helper
              ? 'helper@example.com'
              : admin
                ? 'admin@example.com'
                : 'owner@example.com',
            user_metadata: helper
              ? { name: 'Helper', invited: true }
              : { name: admin ? 'Admin' : 'Owner' },
          },
        }),
      );
      localStorage.setItem(
        'jastip-ops-v1',
        JSON.stringify({ shop: { name: 'Old fake shop' }, orders: [{ name: 'Fake Buyer' }] }),
      );
    },
    { admin, helper },
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
  await expect(page.getByRole('heading', { name: 'Welcome to Bawa' })).toBeVisible();
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
test('owner invites a teammate by email; the link signs them in and they join', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Starter allows one member; the platform admin upgrades this workspace to Pro first.
  const jwt = (sub) =>
    Buffer.from('{"alg":"HS256"}').toString('base64url') +
    '.' +
    Buffer.from(JSON.stringify({ sub, role: 'authenticated', exp: 9999999999 })).toString(
      'base64url',
    ) +
    '.test';
  const rpc = async (name, body, sub) => {
    const res = await fetch('http://127.0.0.1:54329/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + jwt(sub) },
      body: JSON.stringify(body),
    });
    expect(res.ok).toBe(true);
    return res.json();
  };
  const owner = '00000000-0000-0000-0000-000000000001';
  const workspace = (await rpc('jastip_load_workspace', {}, owner)).workspaceId;
  await rpc(
    'jastip_admin_action',
    { p_workspace: workspace, p_action: 'plan', p_value: { plan: 'Pro' } },
    '00000000-0000-0000-0000-000000000004',
  );
  await session(page);
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Team & roles', exact: true }).click();
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByLabel('Email address').fill('helper@example.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(/Invitation emailed to helper@example.com/)).toBeVisible();
  await expect(page.getByText('Team & roles', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Invitation sent · waiting for them to open the email link'),
  ).toBeVisible();
  const emails = await (await fetch('http://127.0.0.1:54329/test/emails')).json();
  const sent = emails.at(-1);
  expect(sent.email).toBe('helper@example.com');
  const invite = new URL(sent.redirect).searchParams.get('invite');
  expect(invite).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole('button', { name: 'Resend email' }).click();
  await expect(page.getByText('Invitation email sent again to helper@example.com.')).toBeVisible();
  const helper = await browser.newPage();
  helper.on('pageerror', (e) => errors.push(e.message));
  await session(helper, false, true);
  await helper.goto('http://127.0.0.1:3002/?invite=' + invite);
  await expect(helper.getByText('You joined the workspace. Welcome to the team!')).toBeVisible();
  await expect(helper.getByRole('dialog', { name: 'Set your password' })).toBeVisible();
  await helper.getByLabel('New password').fill('correct horse battery');
  await helper.getByRole('button', { name: 'Save password' }).click();
  await expect(helper.getByText(/Password saved/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Team & roles', exact: true }).click();
  await expect(page.locator('.member-row').filter({ hasText: 'helper@example.com' })).toContainText(
    'Active',
  );
  expect(errors).toEqual([]);
  await helper.close();
});
test('SGD trip prices validate on the server; storefront theme and team edits persist', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await session(page);
  await page.goto('/#Trips');
  await page.getByRole('button', { name: 'New trip', exact: true }).first().click();
  await page.getByLabel('Trip name').fill('Tokyo for Singapore');
  await page.getByLabel('Shopping destination').fill('Tokyo');
  await page.getByLabel('Selling currency').selectOption('SGD');
  await page.getByRole('button', { name: 'Create trip' }).click();
  await expect(page.getByText('Sell in SGD')).toBeVisible();
  await page.getByLabel('Trip status').selectOption('Open for orders');
  await expect(page.getByText('Tokyo for Singapore moved to Open for orders.')).toBeVisible();
  await page.goto('/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).first().click();
  await page
    .getByRole('dialog')
    .getByLabel('Trip', { exact: true })
    .selectOption({ label: 'Tokyo for Singapore' });
  await page.getByLabel('Item name').fill('Singapore matcha');
  await page.getByLabel('Purchase price', { exact: true }).fill('3333');
  await page.getByLabel('Quantity', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Post item' }).click();
  await expect(page.locator('.item-card').filter({ hasText: 'Singapore matcha' })).toContainText(
    'S$',
  );
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Storefront', exact: true }).click();
  await page.getByRole('radio', { name: /Trip showcase/ }).click();
  await page.getByRole('radio', { name: 'teal storefront colour' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Storefront settings saved.')).toBeVisible();
  const buyer = await browser.newPage();
  buyer.on('pageerror', (e) => errors.push(e.message));
  await buyer.goto('http://127.0.0.1:3002/#Storefront/actual-shop');
  await expect(buyer.locator('.storefront.store-showcase')).toBeVisible();
  const card = buyer.locator('.store-product').filter({ hasText: 'Singapore matcha' });
  await expect(card).toContainText('S$');
  await card.click();
  await buyer.getByRole('button', { name: 'Order this item' }).click();
  await buyer.getByLabel('Your name').fill('SG Buyer');
  await buyer.getByLabel('WhatsApp number').fill('6581234567');
  await buyer.getByLabel('Delivery address').fill('Singapore 238859');
  await buyer.getByRole('checkbox').check();
  await buyer.getByRole('button', { name: 'Place order' }).click();
  await expect(buyer.getByText('Private tracking token', { exact: true })).toBeVisible();
  await page.goto('/#Orders');
  await expect(page.locator('tr').filter({ hasText: 'SG Buyer' })).toContainText('S$');
  await page.goto('/#Settings');
  await page.getByRole('button', { name: 'Team & roles', exact: true }).click();
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByLabel('Email address').fill('typo@exmaple.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(/Invitation emailed to typo@exmaple.com/)).toBeVisible();
  await page.getByRole('button', { name: 'Edit email' }).click();
  await page.getByLabel('Email address').fill('fixed@example.com');
  await page.getByRole('button', { name: 'Save and resend' }).click();
  await expect(page.getByText('Invitation changed and sent to fixed@example.com.')).toBeVisible();
  await expect(page.locator('.member-row').filter({ hasText: 'fixed@example.com' })).toBeVisible();
  await page.getByRole('button', { name: /Remove .*helper/i }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove member' }).click();
  await expect(page.getByText(/was removed/)).toBeVisible();
  await expect(page.locator('.member-row').filter({ hasText: 'helper@example.com' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Cancel invitation for fixed@example.com' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel invitation' }).click();
  await expect(page.locator('.member-row').filter({ hasText: 'fixed@example.com' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await buyer.close();
});
