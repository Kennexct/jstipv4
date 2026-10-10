import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const base = process.env.MOCKUP_URL || 'http://127.0.0.1:3000';
  const captures = [];
  async function capture(name, label, fullPage = true) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const file = path.join(output, name + '.png');
    await page.screenshot({ path: file, fullPage });
    captures.push({ label, file });
  }
  for (const route of [
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
  ]) {
    await page.goto(base + '/#' + route);
    await page.locator('h1').waitFor();
    await capture(route.toLowerCase(), route);
  }
  await page.goto(base + '/#Items');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await capture('item-capture', 'Live item capture', false);
  await page.keyboard.press('Escape');
  await page.goto(base + '/#Orders');
  await page.getByText('Sinta Maharani', { exact: true }).click();
  await capture('order-detail', 'Order detail and payment', false);
  await page.keyboard.press('Escape');
  await page.goto(base + '/#Settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.goto(base + '/#Overview');
  await capture('overview-dark', 'Dark theme');
  await page.goto(base + '/#Settings');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['Overview', 'Orders', 'Items', 'Storefront', 'Trips']) {
    await page.goto(base + '/#' + route);
    await capture(route.toLowerCase() + '-mobile', route + ' · mobile', false);
  }
  const print = await browser.newPage();
  let html =
    '<html><head><style>@page{size:A3 landscape;margin:14mm}body{font:14px Arial;color:#292723}section{height:267mm;break-after:page;display:flex;flex-direction:column}section:last-child{break-after:auto}h1{font-size:20px;margin:0 0 10px}p{font-size:11px;color:#777;margin:0 0 12px}img{display:block;max-width:100%;max-height:238mm;object-fit:contain;object-position:left top;align-self:flex-start}</style></head><body>';
  for (const c of captures) {
    const data = (await readFile(c.file)).toString('base64');
    html += `<section><h1>Jastip Ops / ${c.label}</h1><p>Interactive UI mockup · Reference: PRD v1.0 and Claude Design Taste · Fixture data and simulated transactions</p><img src="data:image/png;base64,${data}"></section>`;
  }
  await print.setContent(html + '</body></html>');
  await print.pdf({
    path: path.join(root, 'docs/Jastip-Ops-Mockup.pdf'),
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(`Exported ${captures.length} captures and docs/Jastip-Ops-Mockup.pdf`);
} finally {
  await browser.close();
}
