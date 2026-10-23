# Architect — sprint-2-money-and-stock (2026-10-23) · ADR-009
**Server**
- `buyer_credits` table.
- 5 RPCs: unavailable, refund, substitute, use_credit, buyer_credits.
- `validate_record` v3 with the ongkir and flag rules.

**Client**
- `src/lib/order-actions.js`: pure functions mirroring each RPC's record transformation; used by demo mode and unit tests.
- `money.js`: `received`, `amountDue`, `refunded` and `paymentState` aware of ongkir and refunds.
- `ops-dialogs.jsx`: Unavailable, Refund, Substitute, UseCredit.
- Store: generic `orderAction(rpcName, args, demoFn, label)`.

**Failure modes**
- Stale revision: the usual message.
- Insufficient credit or over-refund: plain server message.
- Migration missing: the buttons explain that the database update is needed.
