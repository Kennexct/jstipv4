import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyWorkspace, changesBetween, csvCell } from '../src/lib/records.js';
test('production workspace contains no sample data or merchants', () => {
  const data = emptyWorkspace();
  for (const kind of [
    'items',
    'orders',
    'trips',
    'budgets',
    'customers',
    'members',
    'merchants',
    'audit',
    'invoices',
    'reports',
  ])
    assert.deepEqual(data[kind], []);
  assert.equal(data.workspaceId, null);
});
test('database writes contain only changed records, preserving other clients records', () => {
  const old = emptyWorkspace();
  old.items = [
    { id: 'one', name: 'old' },
    { id: 'two', name: 'keep' },
  ];
  const next = structuredClone(old);
  next.items[0].name = 'new';
  assert.deepEqual(changesBetween(old, next), [
    { kind: 'items', data: { id: 'one', name: 'new' } },
  ]);
  next.items.pop();
  assert.throws(() => changesBetween(old, next), /Archive or cancel/);
});
test('CSV exports escape quotes, line breaks and spreadsheet formulas', () => {
  assert.equal(csvCell('a"b\nc'), '"a""b\nc"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell(123), '"123"');
});
