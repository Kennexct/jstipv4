import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUnavailable,
  applyRefund,
  applyUseCredit,
  applySubstitute,
  creditBalance,
  creditBalances,
} from '../src/lib/order-actions.js';
import { paymentState, outstanding, orderProfit, ledgerLabel } from '../src/money.js';

const base = () => ({
  items: [
    {
      id: 'cream',
      trip: 't',
      name: 'Snail cream',
      status: 'Available',
      qty: 4,
      selling: 120000,
      cost: 100000,
      allocation: 0,
    },
    {
      id: 'toner',
      trip: 't',
      name: 'Toner',
      status: 'Available',
      qty: 5,
      selling: 60000,
      cost: 50000,
      allocation: 0,
    },
  ],
  orders: [
    {
      id: 'A',
      name: 'Ayu',
      phone: '+62 811-1111-1111',
      trip: 't',
      itemId: 'cream',
      item: 'Snail cream',
      qty: 2,
      total: 240000,
      paid: 240000,
      deposit: 0,
      quotedCost: 100000,
      allocation: 0,
      status: 'Paid',
      payments: [{ amount: 240000, method: 'Bank transfer' }],
    },
    {
      id: 'B',
      name: 'Budi',
      phone: '628222222222',
      trip: 't',
      itemId: 'cream',
      item: 'Snail cream',
      qty: 2,
      total: 240000,
      paid: 0,
      deposit: 0,
      quotedCost: 100000,
      allocation: 0,
      status: 'Confirmed',
      payments: [],
    },
  ],
  credits: [],
});

test('unavailable cancels, returns stock and keeps the money as credit', () => {
  const d = applyUnavailable(base(), 'A', 'credit', 'Sold out');
  const o = d.orders.find((x) => x.id === 'A');
  assert.equal(o.status, 'Cancelled');
  assert.equal(o.paid, 0);
  assert.equal(o.payments.at(-1).amount, -240000);
  assert.equal(d.items[0].qty, 6);
  assert.equal(creditBalance(d.credits, '0811 1111 1111'.replace(/^0/, '62')), 240000);
  assert.equal(paymentState(o).label, 'Kept as credit');
  assert.throws(() => applyUnavailable(d, 'A', 'refund'), /not bought yet/);
});
test('credit is used on a later order, capped by balance and amount due', () => {
  let d = applyUnavailable(base(), 'A', 'credit', 'Sold out');
  d = {
    ...d,
    orders: [
      ...d.orders,
      {
        ...d.orders[0],
        id: 'A2',
        status: 'Confirmed',
        paid: 0,
        payments: [],
        total: 120000,
        qty: 1,
      },
    ],
  };
  assert.throws(() => applyUseCredit(d, 'A2', 130000), /more than the 120000/);
  d = applyUseCredit(d, 'A2', 120000);
  assert.equal(d.orders.find((x) => x.id === 'A2').status, 'Paid');
  assert.equal(
    ledgerLabel(d.orders.find((x) => x.id === 'A2').payments.at(-1)),
    'Paid with credit',
  );
  assert.deepEqual(creditBalances(d.credits), [{ phone: '6281111111111', balance: 120000 }]);
  assert.throws(() => applyUseCredit(d, 'B', 1), /Only 0 credit/);
});
test('substitute edits the same order, moves stock and refunds the extra', () => {
  let d = applySubstitute(base(), 'A', { itemId: 'toner', qty: 5 }, null, 'Cream gone');
  let o = d.orders.find((x) => x.id === 'A');
  assert.equal(o.total, 300000);
  assert.equal(o.status, 'Confirmed');
  assert.equal(d.items[0].qty, 6);
  assert.equal(d.items[1].qty, 0);
  assert.throws(
    () => applySubstitute(base(), 'A', { item: 'Mini', qty: 1, unitPrice: 50000, unitCost: 40000 }),
    /extra 190000/,
  );
  d = applySubstitute(
    base(),
    'A',
    { item: 'Mini', qty: 1, unitPrice: 50000, unitCost: 40000 },
    'refund',
    'Smaller',
  );
  o = d.orders.find((x) => x.id === 'A');
  assert.equal(o.paid, 50000);
  assert.equal(o.itemId, null);
  assert.equal(o.substitutions.length, 1);
  assert.throws(() => applySubstitute(base(), 'A', { itemId: 'toner', qty: 9 }), /Only 5 left/);
});
test('refunds: blocked when paid/shipped, compensation after delivery lowers profit', () => {
  assert.throws(() => applyRefund(base(), 'A', 1000, 'refund', 'x'), /after it is delivered/);
  const delivered = base();
  delivered.orders[0] = { ...delivered.orders[0], status: 'Delivered', actualCost: 100000 };
  assert.throws(() => applyRefund(delivered, 'A', 1000, 'refund', ''), /short reason/);
  const d = applyRefund(delivered, 'A', 25000, 'refund', 'Dented');
  const o = d.orders.find((x) => x.id === 'A');
  assert.equal(o.payments.at(-1).compensation, true);
  assert.equal(orderProfit(o), 240000 - 200000 - 25000);
});
test('ongkir counts toward what is owed but not toward profit', () => {
  const o = {
    total: 240000,
    paid: 240000,
    shippingFee: 15000,
    deposit: 0,
    quotedCost: 100000,
    allocation: 0,
    qty: 2,
  };
  assert.equal(outstanding(o), 15000);
  assert.equal(paymentState(o).label, 'Ongkir due');
  assert.equal(paymentState({ ...o, paid: 255000 }).label, 'Paid in full');
  assert.equal(orderProfit({ ...o, paid: 255000 }, false), 40000);
});
test('phone keys treat 0812 and +62 812 as the same buyer', async () => {
  const { phoneKey } = await import('../src/lib/order-actions.js');
  assert.equal(phoneKey('0812-3456-7890'), phoneKey('+62 812 3456 7890'));
  assert.equal(phoneKey('+65 8123 4567'), '6581234567');
});
