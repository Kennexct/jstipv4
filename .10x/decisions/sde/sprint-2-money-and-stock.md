# SDE — sprint-2-money-and-stock (2026-10-23) · ADR-009
**Built**
- `src/lib/order-actions.js`: pure mirrors of the 4 RPCs, plus `phoneKey` and credit balances. Unit-tested.
- `src/money.js`: `shippingFee`, `owed`, `outstanding`, `ledgerLabel`, `adjustments`, `compensation`, `marginHit`. `paymentState` adds "Ongkir due", "Refunded" and "Kept as credit". `orderProfit` subtracts post-delivery compensation.
- `src/money-dialogs.jsx`: Item unavailable, Refund or credit, Pay with credit, Offer a substitute (copy offer first, then apply).
- `src/order-money.jsx`: drawer pieces (Ongkir row, ledger, credit note, "Something changed?" actions, history, margin hit).
- `src/needs-today.jsx`: Overview queue with 5 groups.
- `src/dialog-frame.jsx`: shared frame.
- **Store:** `credits`, `creditFor` and `orderAction` (live RPC or demo mirror). Credits reload when the revision changes.
- **Messages:** `unavailable` and `substitute` templates; `{ongkir}`; `{sisa}` and `{total}` include ongkir; can-ship checks items + ongkir.
- **Checklist:** "Can’t buy" per line. **Purchase dialog:** margin-drop callout. **Reports:** margin-hit caption. **Customers:** Credit column. **Storefront:** PO countdown. Checklist trip filter at full width on phone.

**Deviations from spec** (all recorded in ADR-009's spirit)
- Payment rules use **net paid**, not "received". Post-delivery ledger appends skip the payment-status rules.
- Partial refunds are allowed before full payment or after delivery, not on Paid/Shipped orders.
- `Paid` means items paid; ongkir may still be due.
- Compensation lines are marked and lower profit.
- Phone keys treat a leading 0 as 62.
- RPC parameter `p_order_id` (because `p_order` is JSON in the test transport).

**Bugs caught during the sprint**
- Shadowed `outstanding` crashed the checklist; the overflow sweep found it.
- The payment input `max` ignored ongkir.

**Tech debt**
- Dashboard JS 459 → 486 KB raw (+7.7 KB gz); consider lazy-loading the money dialogs.
- Demo fixtures have paid amounts without a ledger, so demo ledgers show only the new lines.
