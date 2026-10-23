# EM — sprint-2-money-and-stock (2026-10-23)
**Window:** 9–20 Nov (started early on 23 Oct).

| # | Task | Est | Lead |
|---|---|---|---|
| 1 | Migration + `validate_record` v3 + SQL tests | 2 d | DBA |
| 2 | `order-actions.js` + `money.js` + unit tests | 1 d | SDE |
| 3 | Store `orderAction` + credits loading | 0.5 d | SDE |
| 4 | Dialogs: unavailable, refund, substitute, use credit | 2 d | SDE |
| 5 | Drawer: ongkir, ledger labels, history, margin flag | 1 d | SDE |
| 6 | Needs-me-today, deadline labels, purchase warning, checklist width | 1 d | SDE |
| 7 | E2E + integration + screenshots + reviews | 1.5 d | QA + Security |

**Risk:** the `validate_record` replacement. Mitigation: run the full suite after task 1, before any UI work.
