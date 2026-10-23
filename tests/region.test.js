import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultCouriers,
  couriersOf,
  regionOf,
  needsTracking,
  applySettings,
  setActiveRegion,
  words,
} from '../src/lib/region.js';
import {
  applyReturnCredit,
  applyUseCredit,
  creditUsed,
  phoneKey,
} from '../src/lib/order-actions.js';
import { orderMessage, templatesOf, DEFAULT_TEMPLATES_EN } from '../src/lib/messages.js';
import { paymentState } from '../src/money.js';

test('region defaults to Indonesia; couriers follow the country until the seller sets their own', () => {
  assert.deepEqual(regionOf({}), { country: 'ID', callingCode: '62', language: 'id' });
  assert.equal(
    couriersOf({}).some((c) => c.name === 'JNE'),
    true,
  );
  assert.equal(couriersOf({ region: { country: 'SG' } })[0].name, 'Local courier');
  assert.deepEqual(couriersOf({ couriers: [{ name: 'Ninja Van', tracking: true }] }), [
    { name: 'Ninja Van', tracking: true },
  ]);
  assert.equal(needsTracking(defaultCouriers('ID'), 'gosend'), false);
  assert.equal(needsTracking(defaultCouriers('ID'), 'Brand new courier'), true);
});
test('settings follow the server rules, including the calling-code lock', () => {
  assert.throws(
    () => applySettings({}, { couriers: [{ name: 'A' }, { name: 'a' }] }),
    /listed twice/,
  );
  assert.throws(() => applySettings({}, { couriers: [] }), /between 1 and 30/);
  assert.throws(() => applySettings({}, { region: { callingCode: '+65' } }), /calling code/);
  assert.throws(
    () => applySettings({ hasCredits: true }, { region: { callingCode: '65' } }),
    /can’t change after buyers have credit/,
  );
  const next = applySettings({}, { region: { country: 'SG', callingCode: '65', language: 'en' } });
  assert.deepEqual(next.region, { country: 'SG', callingCode: '65', language: 'en' });
});
test('phone keys use the workspace calling code', () => {
  assert.equal(phoneKey('08123 4567', '65'), '6581234567');
  assert.equal(phoneKey('+65 8123 4567', '65'), '6581234567');
  assert.equal(phoneKey('0812-3456-7890'), '6281234567890');
});
test('credit can be returned partly, reopens a paid order and goes back on the balance', () => {
  const data = {
    settings: { region: { country: 'SG', callingCode: '65', language: 'en' } },
    items: [],
    credits: [{ phone: '6581234567', amount: 105000, kind: 'issue' }],
    orders: [
      {
        id: 'W',
        name: 'Wei',
        phone: '08123 4567',
        status: 'Confirmed',
        total: 105000,
        paid: 0,
        payments: [],
      },
    ],
  };
  let d = applyUseCredit(data, 'W', 105000);
  assert.equal(d.orders[0].status, 'Paid');
  assert.equal(creditUsed(d.orders[0]), 105000);
  assert.throws(() => applyReturnCredit(d, 'W', 200000), /Only 105000 of credit/);
  d = applyReturnCredit(d, 'W', 50000);
  const o = d.orders[0];
  assert.equal(o.status, 'Confirmed');
  assert.equal(o.paid, 55000);
  assert.equal(o.payments.at(-1).type, 'credit-return');
  assert.equal(creditUsed(o), 55000);
  assert.equal(
    d.credits.filter((c) => c.phone === '6581234567').reduce((s, c) => s + c.amount, 0),
    50000,
  );
  assert.throws(() => applyReturnCredit(d, 'W', 60000), /Only 55000 of credit/);
  const shipped = { ...d, orders: [{ ...o, status: 'Shipped' }] };
  assert.throws(() => applyReturnCredit(shipped, 'W', 1), /before the order ships/);
});
test('messages and labels follow the region language', () => {
  assert.equal(templatesOf({}, 'en').quote, DEFAULT_TEMPLATES_EN.quote);
  const order = { id: 'JO-1', name: 'Wei Lin', item: 'Tea', qty: 1, total: 10, status: 'Shipped' };
  assert.match(orderMessage('status', order, { language: 'en', currency: 'SGD' }), /now shipped/);
  setActiveRegion({ country: 'SG', callingCode: '65', language: 'en' });
  assert.match(orderMessage('status', order, { currency: 'SGD' }), /^Hi Wei/);
  assert.equal(paymentState({ total: 10, paid: 10, shippingFee: 2 }).label, 'Shipping due');
  assert.equal(words({ country: 'SG' }).trackingLong, 'tracking number');
  setActiveRegion(null);
  assert.equal(paymentState({ total: 10, paid: 10, shippingFee: 2 }).label, 'Ongkir due');
});
