// Pure helpers for the support chat (unit-tested in tests/chat.test.js).
// Turns raw RPC errors into copy a visitor can act on.
export function chatError(error) {
  const text = error?.message || String(error || '');
  if (/migration has not been applied/i.test(text))
    return "Chat isn't set up yet. Please try again later.";
  if (/failed to fetch|network/i.test(text))
    return 'You seem to be offline. Your message is still here.';
  return text;
}

// Merge messages by id so overlapping polls never duplicate a bubble.
export function mergeMessages(current, incoming = []) {
  const byId = new Map(current.map((m) => [m.id, m]));
  incoming.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// "14:05" today, "Mon 14:05" this week, "21 Oct" otherwise.
export function chatTime(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  if (now - d < 6 * 864e5 && now >= d)
    return d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + time;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
