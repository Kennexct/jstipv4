import test from 'node:test';
import assert from 'node:assert/strict';
import { margin, orderProfit, allocate } from '../src/money.js';
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
