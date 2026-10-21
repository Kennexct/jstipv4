# ADR-003: Selling (base) currency per trip

**Status:** Accepted · **Date:** 2026-10-21 · **Feature:** trip-currency-storefront-team

## Context
Kenny's merchants may live outside Indonesia, and one merchant can sell different trips to customers in different countries. Until now every amount was IDR (`money()` hard-coded "Rp", rates were X→IDR, server rounded selling prices to Rp 1.000).

## Decision
- Trip record gains `baseCurrency` (selling currency; legacy = IDR). `currency` stays the purchase currency and `rate` means purchase → selling currency.
- Items, orders and expenses carry `baseCurrency` copied from their trip; the server (`jastip.validate_record`) rejects mismatches.
- A trip's `baseCurrency` locks once any item/order/expense references the trip.
- Money precision per currency: IDR/JPY/KRW 0 decimals, others 2. Selling-price rounding step: IDR 1000, KRW 100, JPY 10, others 1. Server checks cost/selling with a tolerance of one minor unit / one step to avoid JS-vs-Postgres float rounding mismatches.
- No cross-currency conversion: dashboards, reports and purchasing show totals per currency with a currency filter.

## Alternatives Considered
| Alternative | Why not |
|---|---|
| One base currency per workspace | Kenny wants per-trip (different customer countries per trip) |
| Convert to a home currency | Totals depend on typed rates; Kenny chose per-currency totals |
| Display-only symbol change | Old amounts would change meaning |

## Consequences
+ Honest totals, no silent conversion; legacy data stays IDR without migration.
− Every `money()` call must know its currency; totals need a currency filter.
Risk: rounding mismatch client/server → mitigated with tolerance and shared constants (`src/money.js` ↔ `jastip.currency_decimals/price_step`).
