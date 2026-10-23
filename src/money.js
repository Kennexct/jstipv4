import { activeRegion, words } from './lib/region.js';
export const rates = {
  JPY: 105,
  KRW: 12,
  USD: 15700,
  SGD: 12100,
  IDR: 1,
  THB: 470,
  MYR: 3650,
  EUR: 17200,
};
// Selling (base) currencies. Mirrors jastip.currency_decimals / jastip.price_step
// in supabase/migrations/202610210002_trip_currency_storefront_team.sql.
export const currencyNames = {
  IDR: 'Indonesian rupiah',
  SGD: 'Singapore dollar',
  MYR: 'Malaysian ringgit',
  THB: 'Thai baht',
  USD: 'US dollar',
  EUR: 'Euro',
  JPY: 'Japanese yen',
  KRW: 'Korean won',
};
export const decimalsFor = (c = 'IDR') => (['IDR', 'JPY', 'KRW'].includes(c || 'IDR') ? 0 : 2);
export const stepFor = (c = 'IDR') => ({ IDR: 1000, KRW: 100, JPY: 10 })[c || 'IDR'] ?? 1;
export const roundTo = (v, d = 0) => {
  const f = 10 ** d;
  return Math.round((Number(v) + Number.EPSILON) * f) / f;
};
// Default cross rate from the IDR table; merchants can edit a trip's rate.
export const defaultRate = (from, to = 'IDR') =>
  from === to ? 1 : roundTo((rates[from] || 1) / (rates[to] || 1), 6);
export function margin({
  price = 0,
  currency = 'JPY',
  base = 'IDR',
  rate = defaultRate(currency, base),
  markup = 20,
  mode = 'percent',
  allocation = 20000,
  rounding = stepFor(base),
}) {
  const d = decimalsFor(base);
  const purchase = roundTo(Number(price) * Number(rate), d);
  const markupAmount =
    mode === 'percent' ? roundTo((purchase * Number(markup)) / 100, d) : Number(markup);
  const selling = Math.round((purchase + markupAmount) / rounding) * rounding;
  const landed = roundTo(purchase + Number(allocation), d);
  const profit = roundTo(selling - landed, d);
  return { purchase, selling, landed, profit, percent: selling ? (profit / selling) * 100 : 0 };
}
export function money(v, compact = false, currency = 'IDR') {
  if (typeof compact === 'string') [currency, compact] = [compact, false];
  currency ||= 'IDR';
  const n = Number(v) || 0;
  if (currency === 'IDR')
    return (
      'Rp ' +
      new Intl.NumberFormat(
        compact ? 'en' : 'id-ID',
        compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 0 },
      ).format(Math.round(n))
    );
  const d = decimalsFor(currency);
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    ...(compact
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { minimumFractionDigits: d, maximumFractionDigits: d }),
  })
    .format(n)
    .replace(/^\$/, currency === 'SGD' ? 'S$' : currency === 'USD' ? 'US$' : '$');
}
// Selling currency of an item, order or expense = its trip's base currency (legacy: IDR).
export const currencyOf = (record, trips = []) =>
  record?.baseCurrency ||
  (record?.trip && trips.find((t) => t.id === record.trip)?.baseCurrency) ||
  'IDR';
// Ongkir passes through; compensation refunded after delivery lowers profit (ADR-009).
export const compensation = (o) =>
  (o?.payments || [])
    .filter((p) => p.compensation)
    .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
export function orderProfit(o, actual = true) {
  return (
    o.total -
    ((actual ? (o.actualCost ?? o.quotedCost) : o.quotedCost) + o.allocation) * o.qty -
    compensation(o)
  );
}
export function allocate(trip, items, { qty = 1, cost = 0, id } = {}) {
  if (trip.allocation === 'none') return 0;
  const d = decimalsFor(trip.baseCurrency);
  if (trip.allocation === 'even')
    return roundTo(
      trip.actual /
        Math.max(
          1,
          Number(trip.units),
          items
            .filter((i) => i.trip === trip.id && i.id !== id)
            .reduce((sum, i) => sum + Number(i.qty), 0) + Number(qty),
        ),
      d,
    );
  const total =
    items.filter((i) => i.trip === trip.id && i.id !== id).reduce((a, i) => a + i.cost * i.qty, 0) +
    cost * qty;
  return total ? roundTo((trip.actual * cost) / total, d) : 0;
}
// Mirrors jastip.deposit_for / jastip.is_unlimited in supabase/migrations/202610210001_flexible_orders.sql.
export const MAX_UNLIMITED_PER_ORDER = 20;
export const isUnlimited = (item) => item?.unlimited === true;
export const maxOrderQty = (item) =>
  isUnlimited(item) ? MAX_UNLIMITED_PER_ORDER : Math.max(0, Number(item?.qty) || 0);
export const stockLabel = (item) =>
  isUnlimited(item) ? 'Ready to order' : `${Number(item?.qty) || 0} left`;
export function depositFor(item, total, qty = 1) {
  const value = Number(item?.depositValue) || 0,
    d = decimalsFor(item?.baseCurrency);
  if (item?.depositMode === 'percent') return Math.min(total, roundTo((total * value) / 100, d));
  if (item?.depositMode === 'amount') return Math.min(total, roundTo(value * qty, d));
  return 0;
}
export const depositLabel = (item) =>
  item?.depositMode === 'percent' && item.depositValue
    ? `DP ${Number(item.depositValue)}%`
    : item?.depositMode === 'amount' && item.depositValue
      ? `DP ${money(item.depositValue, false, item.baseCurrency)} / item`
      : '';
// Ongkir (ADR-009) is separate from the frozen item total. What the buyer owes = items + ongkir.
export const shippingFee = (o) => Number(o?.shippingFee) || 0;
export const owed = (o) => (Number(o?.total) || 0) + shippingFee(o);
export const outstanding = (o) =>
  o?.status === 'Cancelled' ? 0 : Math.max(0, owed(o) - (Number(o?.paid) || 0));
// Ledger lines with a type are adjustments made through the order actions.
export const ledgerLabel = (p) =>
  ({
    refund: 'Refund',
    credit: 'Credit issued',
    'credit-use': 'Paid with credit',
    'credit-return': 'Credit returned',
  })[p?.type] ||
  p?.method ||
  'Payment';
export const adjustments = (o, type) =>
  (o?.payments || [])
    .filter((p) => (type ? p.type === type : ['refund', 'credit'].includes(p.type)))
    .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
export function paymentState(order) {
  const paid = Number(order?.paid) || 0,
    total = Number(order?.total) || 0,
    fee = shippingFee(order),
    deposit = Number(order?.deposit) || 0;
  if (order?.status === 'Cancelled' && adjustments(order) > 0)
    return adjustments(order, 'credit') > 0
      ? { label: 'Kept as credit', tone: 'blue' }
      : { label: 'Refunded', tone: 'gray' };
  if (total > 0 && paid >= total + fee) return { label: 'Paid in full', tone: 'green' };
  if (total > 0 && fee > 0 && paid >= total)
    return { label: words(activeRegion()).feeShort + ' due', tone: 'amber' };
  if (deposit > 0 && paid >= deposit) return { label: 'DP paid', tone: 'blue' };
  if (paid > 0) return { label: 'Partly paid', tone: 'amber' };
  if (deposit > 0) return { label: 'DP due', tone: 'amber' };
  return { label: 'Unpaid', tone: 'gray' };
}
// Margin hit: the real purchase cost came in above the quoted cost (shelf price changed).
export const marginHit = (o) =>
  o?.actualCost != null && Number(o.actualCost) > Number(o.quotedCost || 0)
    ? (Number(o.actualCost) - Number(o.quotedCost || 0)) * (Number(o.qty) || 1)
    : 0;
// "Rp 1.250.000 · S$ 64.00": per-currency totals without conversion.
export function moneyTotals(list, trips, value, compact = false) {
  const totals = new Map();
  for (const r of list) {
    const c = currencyOf(r, trips);
    totals.set(c, (totals.get(c) || 0) + Number(value(r) || 0));
  }
  if (!totals.size) return money(0, compact);
  return [...totals].map(([c, v]) => money(v, compact, c)).join(' · ');
}
