// Order money actions (ADR-009, ADR-010). Pure functions that mirror the server RPCs
// (jastip_order_unavailable, jastip_order_refund, jastip_use_credit, jastip_substitute_order,
// jastip_return_credit).
// Demo mode applies them locally; unit tests keep both sides honest. Errors use the server's words.
import { depositFor, isUnlimited } from '../money.js';

// Digits only; a local number (0812…) counts the same as the international form, using the
// workspace calling code (matches jastip.phone_key). Default 62 keeps existing keys valid.
export const phoneKey = (p, callingCode = '62') =>
  String(p || '')
    .replace(/\D/g, '')
    .replace(/^0/, callingCode || '62');
const ccOf = (data) => data?.settings?.region?.callingCode || '62';
export const creditBalance = (credits = [], phone, callingCode) =>
  credits
    .filter((c) => c.phone === phoneKey(phone, callingCode))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
export const creditBalances = (credits = []) => {
  const map = new Map();
  credits.forEach((c) => map.set(c.phone, (map.get(c.phone) || 0) + Number(c.amount || 0)));
  return [...map].filter(([, b]) => b !== 0).map(([phone, balance]) => ({ phone, balance }));
};
const today = () => new Date().toISOString().slice(0, 10);
const line = (amount, type, note = '') => ({
  amount,
  type,
  method: {
    refund: 'Refund',
    credit: 'Credit issued',
    'credit-use': 'Credit',
    'credit-return': 'Credit returned',
  }[type],
  date: today(),
  note: String(note || '')
    .trim()
    .slice(0, 500),
});
const fail = (message) => {
  throw Error(message);
};
const orderOf = (data, id) => data.orders.find((o) => o.id === id) || fail('Order not found.');
const hasPhone = (o, cc) => phoneKey(o.phone, cc).length >= 8;
const moveStock = (items, itemId, delta) => {
  if (!itemId || !delta) return items;
  return items.map((i) => {
    if (i.id !== itemId || isUnlimited(i)) return i;
    if (Number(i.qty) + delta < 0) fail(`Only ${i.qty} left of ${i.name}.`);
    return { ...i, qty: Number(i.qty) + delta };
  });
};
const replace = (data, order, extra = {}) => ({
  ...data,
  ...extra,
  orders: data.orders.map((o) => (o.id === order.id ? order : o)),
});
const issue = (credits, o, amount, note, cc) =>
  amount > 0
    ? [...credits, { phone: phoneKey(o.phone, cc), amount, kind: 'issue', orderId: o.id, note }]
    : credits;

export function applyUnavailable(data, id, mode, note = '') {
  const old = orderOf(data, id);
  if (!['Requested', 'Quoted', 'Confirmed', 'Paid'].includes(old.status))
    fail('Only orders that are not bought yet can be marked unavailable.');
  if (!['refund', 'credit'].includes(mode)) fail('Choose refund or credit.');
  const amount = Number(old.paid) || 0;
  if (mode === 'credit' && amount > 0 && !hasPhone(old, ccOf(data)))
    fail('This buyer has no WhatsApp number to keep credit under.');
  const order = {
    ...old,
    status: 'Cancelled',
    unavailable: { date: new Date().toISOString(), mode, note: String(note).trim() },
    ...(amount > 0
      ? { paid: 0, payments: [...(old.payments || []), line(-amount, mode, note)] }
      : {}),
  };
  return replace(data, order, {
    items: moveStock(data.items, old.itemId, Number(old.qty) || 0),
    credits:
      mode === 'credit'
        ? issue(data.credits || [], old, amount, note, ccOf(data))
        : data.credits || [],
  });
}

export function applyRefund(data, id, amount, mode, note = '') {
  const old = orderOf(data, id);
  if (!['refund', 'credit'].includes(mode)) fail('Choose refund or credit.');
  if (['Paid', 'Shipped', 'Cancelled'].includes(old.status))
    fail(
      'Refunds are recorded before an order is fully paid, or after it is delivered. To cancel, mark the item unavailable.',
    );
  const paid = Number(old.paid) || 0;
  amount = Number(amount);
  if (!(amount > 0) || amount > paid)
    fail(`Enter an amount between 0 and what was paid (${paid}).`);
  if (mode === 'credit' && !hasPhone(old, ccOf(data)))
    fail('This buyer has no WhatsApp number to keep credit under.');
  if (!String(note).trim()) fail('Add a short reason for the refund.');
  const entry = {
    ...line(-amount, mode, note),
    ...(old.status === 'Delivered' ? { compensation: true } : {}),
  };
  const order = { ...old, paid: paid - amount, payments: [...(old.payments || []), entry] };
  return replace(data, order, {
    credits:
      mode === 'credit'
        ? issue(data.credits || [], old, amount, note, ccOf(data))
        : data.credits || [],
  });
}

export function applyUseCredit(data, id, amount) {
  const old = orderOf(data, id);
  if (['Cancelled', 'Delivered', 'Requested'].includes(old.status))
    fail('Credit can be used on quoted or confirmed orders that are still open.');
  const paid = Number(old.paid) || 0,
    total = Number(old.total) || 0,
    due = total + (Number(old.shippingFee) || 0) - paid,
    balance = creditBalance(data.credits, old.phone, ccOf(data));
  amount = Number(amount);
  if (!(amount > 0)) fail('Enter a credit amount.');
  if (amount > balance) fail(`Only ${balance} credit is available for this buyer.`);
  if (amount > due) fail(`That is more than the ${due} still due.`);
  const order = {
    ...old,
    paid: paid + amount,
    payments: [...(old.payments || []), line(amount, 'credit-use')],
    ...(['Quoted', 'Confirmed'].includes(old.status) && paid + amount >= total
      ? { status: 'Paid' }
      : {}),
  };
  return replace(data, order, {
    credits: [
      ...(data.credits || []),
      { phone: phoneKey(old.phone, ccOf(data)), amount: -amount, kind: 'use', orderId: old.id },
    ],
  });
}

// Credit used on an order goes back to the buyer's balance, any amount up to what was used
// (feedback round 1). A paid order that drops below its total reopens as Confirmed.
export const creditUsed = (o) =>
  (o.payments || [])
    .filter((p) => ['credit-use', 'credit-return'].includes(p.type))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
export function applyReturnCredit(data, id, amount) {
  const old = orderOf(data, id);
  if (['Shipped', 'Delivered', 'Cancelled'].includes(old.status))
    fail('Credit can only be returned before the order ships.');
  const used = creditUsed(old);
  amount = Number(amount);
  if (!(amount > 0)) fail('Enter how much credit to return.');
  if (amount > used) fail(`Only ${used} of credit was used on this order.`);
  const paid = (Number(old.paid) || 0) - amount;
  const order = {
    ...old,
    paid,
    payments: [...(old.payments || []), line(-amount, 'credit-return')],
    ...(old.status === 'Paid' && paid < Number(old.total) ? { status: 'Confirmed' } : {}),
  };
  return replace(data, order, {
    credits: [
      ...(data.credits || []),
      {
        phone: phoneKey(old.phone, ccOf(data)),
        amount,
        kind: 'issue',
        orderId: old.id,
        note: 'Returned from ' + old.id,
      },
    ],
  });
}

// change: { itemId } for a catalog item, or { item, unitPrice, unitCost } for a custom one; plus qty.
export function applySubstitute(data, id, change, excessMode, note = '') {
  const old = orderOf(data, id);
  if (!['Confirmed', 'Paid'].includes(old.status))
    fail('Substitutes can be set on confirmed or paid orders before the item is bought.');
  const qty = Number(change?.qty);
  if (!Number.isInteger(qty) || qty < 1) fail('Enter a quantity of at least 1.');
  let items = moveStock(data.items, old.itemId, Number(old.qty) || 0);
  let name,
    unit,
    cost,
    allocation,
    deposit,
    itemId = null;
  if (change.itemId) {
    const i = items.find((x) => x.id === change.itemId);
    if (!i || i.status === 'Draft') fail('Choose an available item.');
    if (i.trip !== old.trip) fail('Choose an item from the same trip.');
    items = moveStock(items, i.id, -qty);
    ({ name } = i);
    unit = Number(i.selling);
    cost = Number(i.cost);
    allocation = Number(i.allocation);
    deposit = depositFor(i, unit * qty, qty);
    itemId = i.id;
  } else {
    name = String(change.item || '').trim();
    if (!name || name.length > 200) fail('Name the substitute item.');
    unit = Number(change.unitPrice);
    if (!(unit > 0)) fail('Enter the new price per item.');
    cost = Number(change.unitCost);
    if (!(cost >= 0) || change.unitCost === '' || change.unitCost == null)
      fail('Enter the estimated cost per item.');
    allocation = Number(old.allocation) || 0;
  }
  const total = unit * qty;
  if (deposit == null) deposit = Math.min(Number(old.deposit) || 0, total);
  let order = {
    ...old,
    item: name,
    itemId,
    qty,
    total,
    quotedCost: cost,
    allocation,
    deposit,
    substitutions: [
      ...(old.substitutions || []),
      {
        date: new Date().toISOString(),
        fromItem: old.item,
        fromQty: old.qty,
        fromTotal: old.total,
        toItem: name,
        toQty: qty,
        toTotal: total,
        note: String(note).trim(),
      },
    ],
  };
  let credits = data.credits || [];
  const excess = (Number(old.paid) || 0) - (total + (Number(old.shippingFee) || 0));
  if (excess > 0) {
    if (!['refund', 'credit'].includes(excessMode))
      fail(`Choose refund or credit for the extra ${excess} already paid.`);
    if (excessMode === 'credit' && !hasPhone(old, ccOf(data)))
      fail('This buyer has no WhatsApp number to keep credit under.');
    order = {
      ...order,
      paid: old.paid - excess,
      payments: [...(old.payments || []), line(-excess, excessMode, 'Substitute: ' + note)],
    };
    if (excessMode === 'credit') credits = issue(credits, old, excess, 'Substitute', ccOf(data));
  }
  if (old.status === 'Paid' && Number(order.paid) < total) order.status = 'Confirmed';
  return replace(data, order, { items, credits });
}
