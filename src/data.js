export const orderStatuses = [
  'Requested',
  'Quoted',
  'Confirmed',
  'Paid',
  'Purchased',
  'Shipped',
  'Delivered',
  'Cancelled',
];
export const tripStatuses = ['Planning', 'Open for orders', 'Shopping', 'Delivering', 'Closed'];
export const planDetails = [
  {
    name: 'Starter',
    price: 49000,
    members: 1,
    items: 50,
    orders: 100,
    features: [
      '1 member',
      '50 active items',
      '2 open trips',
      '100 orders / month',
      'Storefront & basic reports',
    ],
  },
  {
    name: 'Pro',
    price: 149000,
    members: 3,
    items: 500,
    orders: 1000,
    features: [
      '3 members',
      '500 active items',
      'Unlimited trips',
      '1,000 orders / month',
      'Multi-currency & CSV exports',
    ],
  },
  {
    name: 'Business',
    price: 399000,
    members: 10,
    items: 5000,
    orders: 100000,
    features: [
      '10 members',
      '5,000 active items',
      'Unlimited orders',
      'Larger item and order limits',
      'Priority support',
    ],
  },
];
