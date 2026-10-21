// Storefront layouts and curated colours (ADR-004). Keys must match jastip_commit validation
// in supabase/migrations/202610210002_trip_currency_storefront_team.sql.
export const storeLayouts = [
  {
    id: 'marketplace',
    name: 'Marketplace',
    text: 'Busy online-mall feel: coloured top bar, category chips and a dense, price-first grid.',
  },
  {
    id: 'showcase',
    name: 'Trip showcase',
    text: 'Official-store feel: a banner for each trip with a scrolling row of its finds.',
  },
  {
    id: 'lookbook',
    name: 'Lookbook',
    text: 'Editorial feel: big photos and calm spacing, like a curated Instagram shop.',
  },
];
export const storeAccents = {
  indigo: '#4b5bd6',
  blue: '#1f6fd1',
  teal: '#0f7c78',
  emerald: '#13804f',
  orange: '#d9480f',
  red: '#c62828',
  rose: '#c2185b',
  violet: '#7048e8',
  brown: '#8d5b3a',
  charcoal: '#2f2e2b',
};
export function storeTheme(shop) {
  const layout = storeLayouts.some((l) => l.id === shop?.storefront?.layout)
    ? shop.storefront.layout
    : 'marketplace';
  const accent = storeAccents[shop?.storefront?.accent] ? shop.storefront.accent : 'indigo';
  return { layout, accent };
}
