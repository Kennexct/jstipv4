// Example rows for the public landing page preview only (ADR-007).
// Never imported by the app, never written to a workspace, always shown with an "Example data" label.
import { margin } from '../money.js';

export const sampleTrip = {
  name: 'Tokyo autumn run',
  dates: '10–20 Nov',
  currency: 'JPY',
  rate: 105,
  costs: [
    { label: 'Flights', amount: 4200000 },
    { label: 'Hotel, 9 nights', amount: 3150000 },
    { label: 'Excess baggage', amount: 650000 },
  ],
  units: 200,
};
export const tripCostTotal = sampleTrip.costs.reduce((sum, c) => sum + c.amount, 0);
// Even split of trip costs across the units the seller plans to bring home.
export const costShare = Math.round(tripCostTotal / sampleTrip.units);

const item = (id, name, art, price, markup, qty, sold, category) => {
  const m = margin({
    price,
    currency: 'JPY',
    rate: sampleTrip.rate,
    markup,
    allocation: costShare,
  });
  return { id, name, image: art, price, markup, qty, sold, category, ...m };
};
export const sampleItems = [
  item('s1', 'Uji matcha powder, 100 g', 'matcha', 3000, 25, 24, 18, 'Food & drink'),
  item('s2', 'Sunscreen milk SPF50+, 60 ml', 'anessa', 2480, 30, 40, 31, 'Beauty'),
  item('s3', 'Banana custard cakes, box of 8', 'banana', 1200, 40, 30, 30, 'Food & drink'),
  item('s4', 'Running shoes, EU 40', 'shoes', 12800, 18, 3, 1, 'Fashion'),
];
export const heroItem = sampleItems[3];

const byId = Object.fromEntries(sampleItems.map((i) => [i.id, i]));
const order = (id, buyer, itemId, qty, status, paidShare, deposit = 0.3) => {
  const total = byId[itemId].selling * qty;
  return {
    id,
    buyer,
    item: byId[itemId].name,
    qty,
    total,
    deposit: Math.round(total * deposit),
    paid: Math.round(total * paidShare),
    status,
  };
};
export const sampleOrders = [
  order('JT-1042', 'Dewi A.', 's1', 2, 'Confirmed', 0.3),
  order('JT-1043', 'Raka P.', 's4', 1, 'Purchased', 1),
  order('JT-1044', 'Nadia S.', 's2', 3, 'Quoted', 0),
  order('JT-1045', 'Yohan T.', 's3', 4, 'Shipped', 1),
  order('JT-1046', 'Mega L.', 's2', 1, 'Delivered', 1),
];

export const sampleShopping = [
  {
    store: 'Drugstore, Shinjuku',
    lines: [{ name: byId.s2.name, qty: 4, done: true }],
  },
  {
    store: 'Station gift hall, Tokyo',
    lines: [{ name: byId.s3.name, qty: 4, done: false }],
  },
  {
    store: 'Tea shop, Marunouchi',
    lines: [{ name: byId.s1.name, qty: 2, done: false }],
  },
];
