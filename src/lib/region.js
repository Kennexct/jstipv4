// Workspace region and couriers (feedback round 1, ADR-010). Bawa is not Indonesia-only: the
// country, calling code, message language and courier list are the seller's to set. These
// mirror jastip.region_of, jastip.default_couriers and jastip_save_settings on the server.

export const DEFAULT_REGION = { country: 'ID', callingCode: '62', language: 'id' };

// [code, name, calling code, suggested message language]. Anything else: pick "Other".
export const COUNTRIES = [
  ['ID', 'Indonesia', '62', 'id'],
  ['SG', 'Singapore', '65', 'en'],
  ['MY', 'Malaysia', '60', 'en'],
  ['TH', 'Thailand', '66', 'en'],
  ['PH', 'Philippines', '63', 'en'],
  ['VN', 'Vietnam', '84', 'en'],
  ['JP', 'Japan', '81', 'en'],
  ['KR', 'South Korea', '82', 'en'],
  ['TW', 'Taiwan', '886', 'en'],
  ['HK', 'Hong Kong', '852', 'en'],
  ['AU', 'Australia', '61', 'en'],
  ['NZ', 'New Zealand', '64', 'en'],
  ['GB', 'United Kingdom', '44', 'en'],
  ['US', 'United States', '1', 'en'],
  ['ZZ', 'Other', '', 'en'],
];
export const LANGUAGES = [
  ['id', 'Bahasa Indonesia'],
  ['en', 'English'],
];

export function defaultCouriers(country) {
  return country === 'ID'
    ? [
        ['JNE', true],
        ['J&T', true],
        ['SiCepat', true],
        ['AnterAja', true],
        ['Ninja Xpress', true],
        ['POS Indonesia', true],
        ['GoSend', false],
        ['GrabExpress', false],
        ['Pickup', false],
        ['Other', true],
      ].map(([name, tracking]) => ({ name, tracking }))
    : [
        { name: 'Local courier', tracking: true },
        { name: 'Post', tracking: true },
        { name: 'Pickup', tracking: false },
        { name: 'Other', tracking: true },
      ];
}

export const regionOf = (settings) => ({ ...DEFAULT_REGION, ...(settings?.region || {}) });
export const couriersOf = (settings) =>
  settings?.couriers?.length ? settings.couriers : defaultCouriers(regionOf(settings).country);
export const findCourier = (couriers, name) =>
  (couriers || []).find(
    (c) =>
      c.name.toLowerCase() ===
      String(name || '')
        .trim()
        .toLowerCase(),
  );
// Saved couriers without tracking numbers (pickup, same-day ride) don't need one to ship.
export const needsTracking = (couriers, name) => findCourier(couriers, name)?.tracking !== false;

// Indonesian sellers say "ongkir" and "resi"; everyone else sees the plain English words.
export const words = (region) =>
  region?.country === 'ID'
    ? {
        fee: 'Shipping fee (ongkir)',
        feeShort: 'Ongkir',
        tracking: 'Resi',
        trackingLong: 'resi',
        usesTracking: 'Uses resi',
      }
    : {
        fee: 'Shipping fee',
        feeShort: 'Shipping',
        tracking: 'Tracking no.',
        trackingLong: 'tracking number',
        usesTracking: 'Uses tracking numbers',
      };

// Same rules and words as jastip_save_settings, so demo mode and the form agree with the server.
export function checkSettings(value, current = {}) {
  if (value.couriers) {
    const c = value.couriers;
    if (!Array.isArray(c) || c.length < 1 || c.length > 30)
      throw Error('Keep between 1 and 30 couriers.');
    const seen = new Set();
    for (const e of c) {
      const n = String(e?.name || '').trim();
      if (n.length < 1 || n.length > 40 || /[<>]/.test(n))
        throw Error('Courier names need 1–40 characters.');
      if (seen.has(n.toLowerCase())) throw Error(`Courier "${n}" is listed twice.`);
      seen.add(n.toLowerCase());
    }
  }
  if (value.region) {
    const g = { ...regionOf(current), ...value.region };
    if (!/^[A-Z]{2}$/.test(g.country || '')) throw Error('Choose a country.');
    if (!/^[0-9]{1,4}$/.test(g.callingCode || ''))
      throw Error('Enter the country calling code, for example 62 or 65.');
    if (!['id', 'en'].includes(g.language)) throw Error('Choose a message language.');
    if (g.callingCode !== regionOf(current).callingCode && current.hasCredits)
      throw Error(
        'The calling code can’t change after buyers have credit, because their balances are saved under it.',
      );
  }
}
export function applySettings(current = {}, value) {
  checkSettings(value, current);
  const next = { ...current };
  if (value.couriers)
    next.couriers = value.couriers.map((c) => ({
      name: String(c.name).trim(),
      tracking: c.tracking !== false,
    }));
  if (value.region) {
    const g = { ...regionOf(current), ...value.region };
    next.region = { country: g.country, callingCode: g.callingCode, language: g.language };
  }
  return next;
}

// The signed-in workspace's region, set by the store, so shared labels (like "Ongkir due")
// follow the seller's country without threading it through every component.
let active = DEFAULT_REGION;
export const setActiveRegion = (region) => (active = { ...DEFAULT_REGION, ...(region || {}) });
export const activeRegion = () => active;
