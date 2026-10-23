# ADR-009: Ledger adjustments and substitutions through flagged RPCs

**Status:** Accepted (Kenny, 2026-10-23) · **Feature:** sprint-2-money-and-stock · **Author:** 10x-Team (Architect + Staff Engineer + DBA + Security)

## Context
Sprint 2 needs four exceptions to the money invariants:
- **Paid going down** (refunds and credits). Today: "Payments cannot be removed".
- **Frozen pricing changing** (substitute; Kenny chose to edit the same order).
- **Status moving backwards** (Paid → Confirmed after an upsized substitute).
- **A ledger change on a closed Delivered order** (damage refund).

The ledger must stay append-only and auditable, and ordinary saves through `jastip_commit` must keep rejecting all of these.

## Decision
- **The exceptions live only in dedicated SECURITY DEFINER RPCs.** Each RPC:
  - checks the role (Owner/Manager, or any member for use-credit)
  - builds the new order record server-side from the stored one
  - sets a transaction-local flag (`set_config('jastip.ledger'|'jastip.substitute','on',true)`)
  - calls the shared `validate_record`
- **`validate_record` relaxes the specific rule only when its flag is on.** Every other rule still runs: totals ≥ 0, ledger sum = paid, append-only prefix, tracking token, closed orders.
- **Clients cannot set these flags.** PostgREST exposes only `public` functions, and `set_config` lives in `pg_catalog`. The flags are also `is_local`, so they reset at the end of the transaction.
- **Ledger entries gain a `type`:**
  - `refund` and `credit` have amount < 0
  - `credit-use` has amount > 0
  - untyped entries are ordinary payments
- **Rule changes:**
  - "Full payment" compares *received* (the sum of positive entries) with total + `shippingFee`, so later refunds don't make a paid order look unpaid.
  - **Buyer credit** is its own append-only table keyed by workspace + phone digits, so balances survive cancelled orders.

## Alternatives considered
| Alternative | Pros | Cons | Why not |
|---|---|---|---|
| Substitute = cancel + new order (recommended earlier) | No frozen-pricing exception | Kenny chose to edit the same order (one order code for the buyer) | User decision |
| Refunds as a separate table only | Ledger untouched | Paid and the ledger disagree; reports need joins | Kenny: same ledger |
| Let `jastip_commit` accept typed entries | One path | Any client could post refunds with no credit row or stock effects | Weakens the invariant |
| Store credit as a customer record field | Simple | Records are mutable JSON; no audit trail | Money needs append-only rows |

## Consequences
**Positive:**
- The invariants hold on the normal path.
- Every exception has one audited entry point.
- Refunds and credits are visible in the ledger.

**Negative:**
- `validate_record` is replaced again (a 70-line function), which is the riskiest change of the sprint. It is mitigated by the full existing SQL suite plus new tests.
- Received vs paid adds a concept to the UI.

**Risks:**
- A future RPC sets a flag carelessly. Rule: only RPCs listed in this ADR set them, and the SQL tests assert commit-path rejections.

## Dependencies
ADR-001 (flexible orders), ADR-008 (ship RPC pattern). This constrains future money features to the same flag pattern.
