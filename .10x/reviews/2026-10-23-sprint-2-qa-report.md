# QA report — sprint 2 money and stock (2026-10-23)
**Verdict:** ready for deploy after migration 202610240001. Local suites: unit 25, db 4/4, e2e 28, integration 5.

**Manual check on Vercel**
1. Checklist → Can't buy on a paid order → Keep as credit → Customers shows the credit.
2. A new order from the same number → Use credit.
3. Confirmed order → Offer a substitute → copy → apply; the drawer shows History.
4. Add ongkir to a purchased order; shipping is blocked until it's paid.
5. A delivered order → Refund or credit → the margin drops by that amount.
6. Overview: Needs you today.
7. Item with a deadline in 2 days → the storefront card shows the countdown.
