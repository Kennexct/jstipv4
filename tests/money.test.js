import test from 'node:test';
import assert from 'node:assert/strict';
import {
  margin,
  orderProfit,
  allocate,
  depositFor,
  paymentState,
  maxOrderQty,
  stockLabel,
} from '../src/money.js';
import { itemsSeed, ordersSeed } from '../src/demo/fixtures.js';
test('PRD pricing example includes trip allocation in profit', () => {
  const m = margin({ price: 3000, rate: 105, markup: 20, allocation: 20000 });
  assert.equal(m.purchase, 315000);
  assert.equal(m.selling, 378000);
  assert.equal(m.profit, 43000);
  assert.ok(Math.abs(m.percent - 11.3757) < 0.001);
});
test('fixed markup, base currency and negative margin', () => {
  const m = margin({
    price: 100000,
    currency: 'IDR',
    markup: 10000,
    mode: 'fixed',
    allocation: 20000,
  });
  assert.equal(m.selling, 110000);
  assert.equal(m.profit, -10000);
});
test('order profit stays frozen when item pricing changes; actual costs update independently', () => {
  const o = structuredClone(ordersSeed.find((o) => o.id === 'JO-1046'));
  const old = orderProfit(o, false);
  const items = structuredClone(itemsSeed);
  items.find((i) => i.id === o.itemId).cost = 999999;
  assert.equal(orderProfit(o, false), old);
  assert.equal(
    orderProfit({ ...o, actualCost: 100000 }),
    o.total - (100000 + o.allocation) * o.qty,
  );
});
test('expense allocation supports none, even and item value', () => {
  assert.equal(allocate({ allocation: 'none' }, []), 0);
  assert.equal(allocate({ allocation: 'even', actual: 60000, units: 3 }, [], { qty: 1 }), 20000);
  assert.equal(
    allocate(
      { allocation: 'value', actual: 60000, id: 't' },
      [{ trip: 't', id: 'old', cost: 100, qty: 1 }],
      { cost: 200, qty: 1 },
    ),
    40000,
  );
});
test('down payment mirrors the server: percent of total or fixed per unit, capped at total', () => {
  assert.equal(depositFor({ depositMode: 'percent', depositValue: 50 }, 378000, 3), 189000);
  assert.equal(depositFor({ depositMode: 'amount', depositValue: 100000 }, 378000, 3), 300000);
  assert.equal(depositFor({ depositMode: 'amount', depositValue: 500000 }, 126000, 1), 126000);
  assert.equal(depositFor({ depositMode: 'none', depositValue: 50 }, 378000, 3), 0);
  assert.equal(depositFor(undefined, 378000, 3), 0);
});
test('payment state separates down payment from full payment', () => {
  assert.equal(paymentState({ total: 100, paid: 0 }).label, 'Unpaid');
  assert.equal(paymentState({ total: 100, paid: 0, deposit: 50 }).label, 'DP due');
  assert.equal(paymentState({ total: 100, paid: 20, deposit: 50 }).label, 'Partly paid');
  assert.equal(paymentState({ total: 100, paid: 50, deposit: 50 }).label, 'DP paid');
  assert.equal(paymentState({ total: 100, paid: 100, deposit: 50 }).label, 'Paid in full');
});
test('no-limit items cap a single order at 20 and never show stock counts', () => {
  assert.equal(maxOrderQty({ unlimited: true, qty: 0 }), 20);
  assert.equal(maxOrderQty({ qty: 3 }), 3);
  assert.equal(stockLabel({ unlimited: true, qty: 0 }), 'Ready to order');
  assert.equal(stockLabel({ qty: 2 }), '2 left');
});
