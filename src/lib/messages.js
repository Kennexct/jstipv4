// Message templates for buyers (ADR-008). Pure functions, unit-tested in tests/messages.test.js.
// Output is plain text for the clipboard. Bawa never sends it: the seller pastes and sends.
import { money, owed, outstanding, shippingFee } from '../money.js';
import { activeRegion } from './region.js';

export const TEMPLATE_KEYS = [
  'quote',
  'reminder',
  'status',
  'shipped',
  'unavailable',
  'substitute',
];
export const TEMPLATE_LABELS = {
  quote: 'Quote',
  reminder: 'Payment reminder',
  status: 'Status update',
  shipped: 'Shipped',
  unavailable: 'Item unavailable',
  substitute: 'Substitute offer',
};
export const DEFAULT_TEMPLATES = {
  quote:
    'Halo Kak {nama}! Untuk {qty} × {item} totalnya {total}. DP {dp} ya Kak, transfer ke {rekening}. Balas "OK" untuk konfirmasi. Kode pesanan {order}.',
  reminder:
    'Halo Kak {nama}, mengingatkan sisa pembayaran {sisa} untuk pesanan {order} ({item}). Transfer ke {rekening}. Terima kasih!',
  status: 'Halo Kak {nama}, pesanan {order} ({item}) sekarang: {status}. Cek di sini: {link_lacak}',
  shipped:
    'Halo Kak {nama}, pesanan {order} sudah dikirim via {kurir}, resi {resi}. Lacak pesanan: {link_lacak}. Terima kasih sudah titip!',
  unavailable:
    'Halo Kak {nama}, mohon maaf, {item} untuk pesanan {order} sedang habis di toko. {penyelesaian} Maaf ya Kak, terima kasih atas pengertiannya.',
  substitute:
    'Halo Kak {nama}, {item} untuk pesanan {order} habis. Ada pengganti: {pengganti} × {qty_baru}, totalnya {total_baru}. Mau diganti, Kak? Balas "OK" ya.',
};
// English defaults for sellers outside Indonesia (feedback round 1). Same placeholders.
export const DEFAULT_TEMPLATES_EN = {
  quote:
    'Hi {nama}! {qty} × {item} comes to {total}. Please pay {dp} to {rekening} and reply "OK" to confirm. Order code {order}.',
  reminder:
    'Hi {nama}, a friendly reminder that {sisa} is still due for order {order} ({item}). Please pay to {rekening}. Thank you!',
  status: 'Hi {nama}, your order {order} ({item}) is now {status}. Check it here: {link_lacak}',
  shipped:
    'Hi {nama}, order {order} is on its way with {kurir}, tracking {resi}. Follow it here: {link_lacak}. Thanks for shopping with us!',
  unavailable:
    'Hi {nama}, we’re sorry — {item} for order {order} is sold out at the store. {penyelesaian} Thank you for understanding.',
  substitute:
    'Hi {nama}, {item} for order {order} is sold out. We can get {pengganti} × {qty_baru} instead, for {total_baru}. Would you like that? Reply "OK".',
};
export const defaultTemplates = (language) =>
  language === 'en' ? DEFAULT_TEMPLATES_EN : DEFAULT_TEMPLATES;
export const PLACEHOLDERS = [
  ['{nama}', 'Buyer’s first name'],
  ['{item}', 'Item name'],
  ['{qty}', 'Quantity'],
  ['{total}', 'Order total'],
  ['{dp}', 'Down payment'],
  ['{sisa}', 'Amount still to pay'],
  ['{status}', 'Order status'],
  ['{order}', 'Order code'],
  ['{rekening}', 'Your bank account'],
  ['{kurir}', 'Courier'],
  ['{resi}', 'Resi number'],
  ['{link_lacak}', 'Tracking link'],
  ['{ongkir}', 'Shipping fee'],
  ['{penyelesaian}', 'Refund or credit sentence'],
  ['{pengganti}', 'Substitute item'],
  ['{qty_baru}', 'Substitute quantity'],
  ['{total_baru}', 'Substitute total'],
];
const STATUS_EN = {
  Requested: 'waiting for a quote',
  Quoted: 'quoted',
  Confirmed: 'confirmed',
  Paid: 'paid',
  Purchased: 'bought',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};
const STATUS_ID = {
  Requested: 'menunggu penawaran',
  Quoted: 'sudah ditawarkan',
  Confirmed: 'dikonfirmasi',
  Paid: 'lunas',
  Purchased: 'sudah dibeli',
  Shipped: 'dikirim',
  Delivered: 'sudah diterima',
  Cancelled: 'dibatalkan',
};

// "BCA 123 456 7890 a.n. Rina", or '' when nothing is saved.
export function bankLine(bank = {}) {
  const parts = [bank.bank, bank.number].map((v) => (v || '').trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts.join(' ') + (bank.holder?.trim() ? ` a.n. ${bank.holder.trim()}` : '');
}

// Values for every placeholder of one order. Missing values become '' and are tidied away.
export function orderValues(
  order,
  { currency = 'IDR', bank, trackingLink = '', extra = {}, language = 'id' } = {},
) {
  const total = Number(order.total) || 0,
    paid = Number(order.paid) || 0,
    deposit = Number(order.deposit) || 0;
  return {
    nama: (order.name || '').trim().split(/\s+/)[0] || '',
    item: order.item || '',
    qty: String(order.qty ?? ''),
    total: money(owed(order), false, currency),
    dp: deposit > 0 ? money(deposit, false, currency) : money(total, false, currency),
    sisa: money(outstanding(order), false, currency),
    ongkir: shippingFee(order) ? money(shippingFee(order), false, currency) : '',
    status:
      (language === 'en' ? STATUS_EN : STATUS_ID)[order.status] ||
      (order.status || '').toLowerCase(),
    order: order.id || '',
    rekening: bankLine(bank),
    kurir: order.courier || '',
    resi: order.resi || '',
    link_lacak: trackingLink,
    ...extra,
  };
}

// Replaces known {keys}. Unknown {keys} stay visible so typos are easy to spot.
export function renderTemplate(template, values) {
  return String(template || '')
    .replace(/\{([a-z_]+)\}/g, (all, key) => (key in values ? values[key] : all))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([.,!?)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
}

export const templatesOf = (messaging, language = 'id') => ({
  ...defaultTemplates(language),
  ...Object.fromEntries(
    Object.entries(messaging?.templates || {}).filter(([k, v]) => TEMPLATE_KEYS.includes(k) && v),
  ),
});

export function orderMessage(kind, order, options = {}) {
  const language = options.language || activeRegion().language;
  const template = templatesOf(options.messaging, language)[kind];
  return renderTemplate(
    template,
    orderValues(order, {
      ...options,
      language,
      bank: options.messaging?.bank,
      extra: options.extra || {},
    }),
  );
}

// Public link that opens the buyer's tracking result directly.
export const trackingLink = (base, slug, order) =>
  base && slug && order?.trackingToken
    ? `${base}#Storefront/${encodeURIComponent(slug)}/track/${order.trackingToken}`
    : '';

// Couriers are the seller's own list now (lib/region.js), not a fixed Indonesian one.
export const normaliseResi = (value) => (value || '').trim().toUpperCase();
export const validResi = (value) => /^[A-Z0-9-]{4,40}$/.test(normaliseResi(value));
// Matches the server: purchased (or already shipped) and fully paid.
export const canShip = (order) =>
  ['Purchased', 'Shipped'].includes(order.status) && (Number(order.paid) || 0) >= owed(order);
export const shipBlocker = (order) =>
  !['Purchased', 'Shipped'].includes(order.status)
    ? order.status === 'Delivered'
      ? 'Already delivered'
      : 'Not purchased yet'
    : (Number(order.paid) || 0) < owed(order)
      ? 'Not fully paid'
      : '';
