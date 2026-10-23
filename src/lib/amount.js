// Amount fields with thousand separators that follow the currency (feedback round 1):
// IDR 1.250.000 · SGD 1,250.50. The stored value stays a plain number string ("1250000.5").
import { decimalsFor } from '../money.js';

export const separatorsFor = (currency = 'IDR') =>
  currency === 'IDR' ? { group: '.', decimal: ',' } : { group: ',', decimal: '.' };

// What the person typed → canonical "1234.5" ('' when empty). Pasting "Rp 1.250.000" works too.
export function parseAmount(text, currency = 'IDR') {
  const { decimal } = separatorsFor(currency),
    places = decimalsFor(currency);
  let s = String(text ?? '').trim();
  if (!s) return '';
  let [whole, ...rest] = s.split(decimal);
  whole = whole.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!places || !rest.length) return whole;
  const frac = rest.join('').replace(/\D/g, '').slice(0, places);
  return `${whole || '0'}.${frac}`;
}

// Canonical "1234.5" → "1,234.5". Keeps a trailing decimal point while typing.
export function formatAmount(value, currency = 'IDR') {
  const raw = String(value ?? '');
  if (raw === '') return '';
  const { group, decimal } = separatorsFor(currency),
    places = decimalsFor(currency);
  const [whole, frac] = raw.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return places && frac !== undefined ? grouped + decimal + frac.slice(0, places) : grouped;
}
