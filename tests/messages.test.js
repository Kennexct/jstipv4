import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTemplate,
  orderMessage,
  orderValues,
  bankLine,
  trackingLink,
  templatesOf,
  canShip,
  shipBlocker,
  validResi,
  normaliseResi,
  DEFAULT_TEMPLATES,
} from '../src/lib/messages.js';

const order = {
  id: 'JO-1047',
  name: 'Aditya Pratama',
  item: 'Matcha ceremonial blend',
  qty: 2,
  total: 850000,
  paid: 425000,
  deposit: 425000,
  status: 'Confirmed',
  trackingToken: 'a'.repeat(64),
};
const messaging = { bank: { bank: 'BCA', number: '123 456 7890', holder: 'Rina' } };

test('default quote is Indonesian and fills buyer, totals and bank account', () => {
  const text = orderMessage('quote', order, { messaging });
  assert.match(text, /^Halo Kak Aditya!/);
  assert.match(text, /2 × Matcha ceremonial blend/);
  assert.match(text, /Rp 850\.000/);
  assert.match(text, /DP Rp 425\.000/);
  assert.match(text, /BCA 123 456 7890 a\.n\. Rina/);
  assert.match(text, /JO-1047/);
});
test('reminder shows the amount still to pay', () => {
  assert.match(orderMessage('reminder', order, { messaging }), /sisa pembayaran Rp 425\.000/);
});
test('saved templates override defaults; empty ones fall back', () => {
  const t = templatesOf({ templates: { quote: 'Q {nama}', reminder: '' } });
  assert.equal(t.quote, 'Q {nama}');
  assert.equal(t.reminder, DEFAULT_TEMPLATES.reminder);
});
test('unknown placeholders stay visible and empty values are tidied', () => {
  assert.equal(renderTemplate('Hi {nama} {typo}!', { nama: 'Dewi' }), 'Hi Dewi {typo}!');
  assert.equal(renderTemplate('Transfer ke {rekening}.', { rekening: '' }), 'Transfer ke.');
  assert.equal(bankLine({}), '');
});
test('status is translated and shipped message carries courier, resi and link', () => {
  assert.equal(orderValues({ ...order, status: 'Purchased' }).status, 'sudah dibeli');
  const link = trackingLink('https://bawaapp.vercel.app/', 'rina-tokyo', order);
  assert.equal(link, 'https://bawaapp.vercel.app/#Storefront/rina-tokyo/track/' + 'a'.repeat(64));
  const text = orderMessage(
    'shipped',
    { ...order, courier: 'JNE', resi: 'JNE123' },
    { messaging, trackingLink: link },
  );
  assert.match(text, /via JNE, resi JNE123/);
  assert.match(text, /#Storefront\/rina-tokyo\/track\//);
});
test('shipping eligibility mirrors the server rules', () => {
  assert.equal(canShip({ ...order, status: 'Purchased', paid: 850000 }), true);
  assert.equal(shipBlocker({ ...order, status: 'Purchased' }), 'Not fully paid');
  assert.equal(shipBlocker({ ...order, status: 'Confirmed', paid: 850000 }), 'Not purchased yet');
  assert.equal(shipBlocker({ ...order, status: 'Delivered', paid: 850000 }), 'Already delivered');
  assert.equal(normaliseResi(' jt0012 '), 'JT0012');
  assert.equal(validResi('jt-0012345'), true);
  assert.equal(validResi('<x>'), false);
});
