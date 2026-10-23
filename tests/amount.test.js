import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, parseAmount } from '../src/lib/amount.js';

test('amounts group thousands the way each currency is written', () => {
  assert.equal(formatAmount('1250000', 'IDR'), '1.250.000');
  assert.equal(formatAmount('1250000.5', 'SGD'), '1,250,000.5');
  assert.equal(formatAmount('12.', 'USD'), '12.');
  assert.equal(formatAmount('', 'IDR'), '');
  assert.equal(formatAmount('3000', 'JPY'), '3,000');
});
test('typed or pasted amounts become plain numbers', () => {
  assert.equal(parseAmount('Rp 1.250.000', 'IDR'), '1250000');
  assert.equal(parseAmount('1,250.505', 'SGD'), '1250.50');
  assert.equal(parseAmount('007', 'IDR'), '7');
  assert.equal(parseAmount('', 'IDR'), '');
  assert.equal(parseAmount('.5', 'USD'), '0.5');
  assert.equal(parseAmount('1.000,5', 'IDR'), '1000');
});
