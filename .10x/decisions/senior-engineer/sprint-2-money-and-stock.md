# Senior engineer — sprint-2-money-and-stock (2026-10-23)
- `received(o)` = sum of positive payment amounts, or `paid` when there's no ledger (legacy).
- Still to pay: `outstanding(o) = max(0, total + shippingFee − received)`. Refunds don’t reduce what was owed; they reduce `paid` (net).
- Substitute stock: restore the old item's stock if it's not unlimited; reserve the new item if it's a catalog item, not unlimited, and has enough stock.
- Unavailable is allowed for statuses Requested, Quoted, Confirmed and Paid.
- Refunds are capped at the current `paid` (net). Use credit is capped at min(balance, outstanding).
- Phone keys: digits only (the same normalisation as the place-order rate limit).
