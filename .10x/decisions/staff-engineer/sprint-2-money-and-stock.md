# Staff engineer — sprint-2-money-and-stock (2026-10-23)
- Copy `validate_record` verbatim from 202610210002 and patch only the listed lines. Each patch is asserted in the migration build script so drift is caught.
- Ledger entry shape: `{amount, method, date, type?, note?, proof?}`. Display labels: Payment, Refund, Credit issued, Paid with credit.
- One shared `orderAction` in the store keeps busy/pending/revision/reload behaviour identical to `shipOrders`.
- Copy-only messages: new templates `unavailable` and `substitute` (Indonesian defaults).
