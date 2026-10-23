// Message templates for buyers (ADR-008). Pure functions, unit-tested in tests/messages.test.js.
// Output is plain text for the clipboard. Bawa never sends it: the seller pastes and sends.
import { money } from '../money.js';

export const TEMPLATE_KEYS = ['quote', 'reminder', 'status', 'shipped'];
export const TEMPLATE_LABELS = {
  quote: 'Quote',
  reminder: 'Payment reminder',
  status: 'Status update',
  shipped: 'Shipped',
};
export const DEFAULT_TEMPLATES = {
  quote:
    'Halo Kak {nama}! Untuk {qty} × {item} totalnya {total}. DP {dp} ya Kak, transfer ke {rekening}. Balas "OK" untuk konfirmasi. Kode pesanan {order}.',
  reminder:
    'Halo Kak {nama}, mengingatkan sisa pembayaran {sisa} untuk pesanan {order} ({item}). Transfer ke {rekening}. Terima kasih!',
  status: 'Halo Kak {nama}, pesanan {order} ({item}) sekarang: {status}. Cek di sini: {link_lacak}',
  shipped:
    'Halo Kak {nama}, pesanan {order} sudah dikirim via {kurir}, resi {resi}. Lacak pesanan: {link_lacak}. Terima kasih sudah titip!',
};
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
];
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
export function orderValues(order, { currency = 'IDR', bank, trackingLink = '' } = {}) {
  const total = Number(order.total) || 0,
    paid = Number(order.paid) || 0,
    deposit = Number(order.deposit) || 0;
  return {
    nama: (order.name || '').trim().split(/\s+/)[0] || '',
    item: order.item || '',
    qty: String(order.qty ?? ''),
    total: money(total, false, currency),
    dp: deposit > 0 ? money(deposit, false, currency) : money(total, false, currency),
    sisa: money(Math.max(0, total - paid), false, currency),
    status: STATUS_ID[order.status] || (order.status || '').toLowerCase(),
    order: order.id || '',
    rekening: bankLine(bank),
    kurir: order.courier || '',
    resi: order.resi || '',
    link_lacak: trackingLink,
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

export const templatesOf = (messaging) => ({
  ...DEFAULT_TEMPLATES,
  ...Object.fromEntries(
    Object.entries(messaging?.templates || {}).filter(([k, v]) => TEMPLATE_KEYS.includes(k) && v),
  ),
});

export function orderMessage(kind, order, options = {}) {
  const template = templatesOf(options.messaging)[kind];
  return renderTemplate(
    template,
    orderValues(order, { ...options, bank: options.messaging?.bank }),
  );
}

// Public link that opens the buyer's tracking result directly.
export const trackingLink = (base, slug, order) =>
  base && slug && order?.trackingToken
    ? `${base}#Storefront/${encodeURIComponent(slug)}/track/${order.trackingToken}`
    : '';

export const COURIERS = [
  'JNE',
  'J&T',
  'SiCepat',
  'AnterAja',
  'Ninja',
  'POS',
  'GoSend',
  'GrabExpress',
  'Pickup',
  'Other',
];
export const resiOptional = (courier) => ['Pickup', 'GoSend', 'GrabExpress'].includes(courier);
export const normaliseResi = (value) => (value || '').trim().toUpperCase();
export const validResi = (value) => /^[A-Z0-9-]{4,40}$/.test(normaliseResi(value));
// Matches the server: purchased (or already shipped) and fully paid.
export const canShip = (order) =>
  ['Purchased', 'Shipped'].includes(order.status) &&
  (Number(order.paid) || 0) >= (Number(order.total) || 0);
export const shipBlocker = (order) =>
  !['Purchased', 'Shipped'].includes(order.status)
    ? order.status === 'Delivered'
      ? 'Already delivered'
      : 'Not purchased yet'
    : (Number(order.paid) || 0) < (Number(order.total) || 0)
      ? 'Not fully paid'
      : '';
