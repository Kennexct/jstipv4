# Security — sprint-2-money-and-stock (2026-10-23)
**Threats:** forged refunds or credits, price changes after confirmation, credit theft between buyers, and Helpers moving money.

**Controls**
- Exceptions to the money rules exist only behind transaction-local flags set inside 4 SECURITY DEFINER RPCs.
  - The flags can't be set through PostgREST: `set_config` lives in `pg_catalog`, which isn't exposed.
  - The flags reset at commit, and `order_write_end` sets them off explicitly.
  - Tests prove the commit path rejects typed lines, negative payments, a paid decrease and price changes.
- **Roles:**
  - unavailable, refund and substitute are Owner/Manager only
  - use credit is any member (it's recorded like a payment; the Helper field lock still applies)
  - balances are member-only
  - anon has no access to the table or RPCs (tested)
- Credit is keyed per workspace + normalised phone. The use cap is the balance and the amount due, both checked server-side.
- Substitute stock moves and excess refunds happen in the same transaction as the order change (atomic). A failed substitute leaves stock untouched (tested).
- Every action writes an audit row. The ledger and credits are append-only.

**Residual risk**
- A buyer who uses someone else's phone number would share that person's credit. Credit is visible to the seller, who decides when to use it.
- Phone normalisation assumes Indonesian local numbers start with 0.
