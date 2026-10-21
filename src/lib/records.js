export const collections = ['items', 'orders', 'trips', 'budgets', 'customers', 'notes'];
export const emptyWorkspace = () => ({
  workspaceId: null,
  revision: 0,
  role: 'Owner',
  isAdmin: false,
  items: [],
  orders: [],
  trips: [],
  budgets: [],
  customers: [],
  members: [],
  merchants: [],
  audit: [],
  notes: [],
  invoices: [],
  reports: [],
  shop: { name: 'Your workspace', slug: '', bio: '', contact: '' },
  plan: 'Starter',
  preferences: {
    theme: 'light',
    accent: 'forest',
    density: 'comfortable',
    motion: 'full',
    tint: 'subtle',
  },
});
export function changesBetween(previous, next) {
  return collections.flatMap((kind) => {
    const before = new Map(previous[kind].map((record) => [String(record.id), record]));
    if (
      previous[kind].some(
        (record) => !next[kind].some((item) => String(item.id) === String(record.id)),
      )
    )
      throw Error('Record removal is not supported. Archive or cancel the record instead.');
    return next[kind]
      .filter((record) => JSON.stringify(record) !== JSON.stringify(before.get(String(record.id))))
      .map((record) => ({ kind, data: record }));
  });
}
export const recordId = (prefix = '') => prefix + crypto.randomUUID();
export const today = () => new Date().toISOString().slice(0, 10);
export function csvCell(value) {
  const text = String(value ?? '');
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
}
// Walkthrough is done once the user finishes it, or once a trip and an item both exist.
const walkthroughKey = (workspaceId) => 'jo-walkthrough-done:' + (workspaceId || 'demo');
export function markWalkthroughDone(workspaceId) {
  try {
    localStorage.setItem(walkthroughKey(workspaceId), '1');
  } catch {}
}
export function walkthroughDone(data) {
  if (data.trips?.length && data.items?.length) return true;
  try {
    return localStorage.getItem(walkthroughKey(data.workspaceId)) === '1';
  } catch {
    return false;
  }
}
