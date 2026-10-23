# QA — sprint-2-money-and-stock (2026-10-23)
| Suite | Result |
|---|---|
| Unit | 25/25 (+6 order-action and ongkir tests) |
| DB | 4/4 files; new `sprint2-money-and-stock.sql`, ~40 checks, all earlier suites still pass on `validate_record` v3 |
| E2E | 28/28 (+5: unavailable → credit, substitute, ongkir, compensation, needs-today + PO countdown) |
| Integration | 5/5 (+1: unavailable → credit → same buyer pays a new order with it, on PostgreSQL) |
| Build | OK |

**Visual:** 390 px Overview queue, drawer, the Unavailable and Substitute dialogs.

**Not verified:** hosted Supabase (migration not applied yet), real phones.

**Watch in manual QA**
- The ongkir input on an order that's already Paid.
- Credit when the buyer typed their number differently (0812 vs +62).
