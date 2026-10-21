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
export function margin({
  price = 0,
  currency = 'JPY',
  rate = rates[currency],
  markup = 20,
  mode = 'percent',
  allocation = 20000,
  rounding = 1000,
}) {
  const purchase = Math.round(Number(price) * Number(rate));
  const selling =
    Math.round(
      (purchase +
        (mode === 'percent' ? Math.round((purchase * Number(markup)) / 100) : Number(markup))) /
        rounding,
    ) * rounding;
  const landed = purchase + Math.round(Number(allocation));
  const profit = selling - landed;
  return { purchase, selling, landed, profit, percent: selling ? (profit / selling) * 100 : 0 };
}
export const money = (v, compact = false) =>
  'Rp ' +
  new Intl.NumberFormat(
    compact ? 'en' : 'id-ID',
    compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 0 },
  ).format(Math.round(v));
export function orderProfit(o, actual = true) {
  return (
    o.total - ((actual ? (o.actualCost ?? o.quotedCost) : o.quotedCost) + o.allocation) * o.qty
  );
}
export function allocate(trip, items, { qty = 1, cost = 0, id } = {}) {
  if (trip.allocation === 'none') return 0;
  if (trip.allocation === 'even')
    return Math.round(
      trip.actual /
        Math.max(
          1,
          Number(trip.units),
          items
            .filter((i) => i.trip === trip.id && i.id !== id)
            .reduce((sum, i) => sum + Number(i.qty), 0) + Number(qty),
        ),
    );
  const total =
    items.filter((i) => i.trip === trip.id && i.id !== id).reduce((a, i) => a + i.cost * i.qty, 0) +
    cost * qty;
  return total ? Math.round((trip.actual * cost) / total) : 0;
}
// Mirrors jastip.deposit_for / jastip.is_unlimited in supabase/migrations/202610210001_flexible_orders.sql.
export const MAX_UNLIMITED_PER_ORDER = 20;
export const isUnlimited = (item) => item?.unlimited === true;
export const maxOrderQty = (item) =>
  isUnlimited(item) ? MAX_UNLIMITED_PER_ORDER : Math.max(0, Number(item?.qty) || 0);
export const stockLabel = (item) =>
  isUnlimited(item) ? 'Ready to order' : `${Number(item?.qty) || 0} left`;
export function depositFor(item, total, qty = 1) {
  const value = Number(item?.depositValue) || 0;
  if (item?.depositMode === 'percent') return Math.min(total, Math.round((total * value) / 100));
  if (item?.depositMode === 'amount') return Math.min(total, Math.round(value * qty));
  return 0;
}
export const depositLabel = (item) =>
  item?.depositMode === 'percent' && item.depositValue
    ? `DP ${Number(item.depositValue)}%`
    : item?.depositMode === 'amount' && item.depositValue
      ? `DP ${money(item.depositValue)} / item`
      : '';
export function paymentState(order) {
  const paid = Number(order?.paid) || 0,
    total = Number(order?.total) || 0,
    deposit = Number(order?.deposit) || 0;
  if (total > 0 && paid >= total) return { label: 'Paid in full', tone: 'green' };
  if (deposit > 0 && paid >= deposit) return { label: 'DP paid', tone: 'blue' };
  if (paid > 0) return { label: 'Partly paid', tone: 'amber' };
  if (deposit > 0) return { label: 'DP due', tone: 'amber' };
  return { label: 'Unpaid', tone: 'gray' };
}
