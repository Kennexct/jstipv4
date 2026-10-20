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
