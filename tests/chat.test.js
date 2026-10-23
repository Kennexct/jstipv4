import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeMessages, chatError, chatTime } from '../src/lib/chat-format.js';
test('chat messages merge by id without duplicates and stay ordered', () => {
  const a = [
    { id: 1, body: 'hi' },
    { id: 2, body: 'there' },
  ];
  const merged = mergeMessages(a, [
    { id: 3, body: 'reply' },
    { id: 2, body: 'there' },
  ]);
  assert.deepEqual(
    merged.map((m) => m.id),
    [1, 2, 3],
  );
  assert.deepEqual(mergeMessages([], undefined), []);
});
test('chat errors become visitor-friendly copy', () => {
  assert.match(
    chatError(Error('The database migration has not been applied. Run…')),
    /isn't set up yet/,
  );
  assert.match(chatError(Error('Failed to fetch')), /offline/);
  assert.equal(chatError(Error('This conversation is closed.')), 'This conversation is closed.');
});
test('chat timestamps are short and relative', () => {
  const now = new Date('2026-10-23T10:00:00');
  assert.equal(chatTime('2026-10-23T08:05:00', now), '08:05');
  assert.equal(chatTime('2026-10-01T08:05:00', now), '1 Oct');
  assert.equal(chatTime('not a date', now), '');
});
