# DBA — sprint-2-money-and-stock (2026-10-23)
**Migration:** `202610240001_sprint2_money_and_stock.sql`. Run it after 202610230001.

**Table:** `jastip.buyer_credits` (identity pk, workspace, phone key, ±amount, kind issue/use, order_id, note, created_by, created_at). Index (workspace_id, phone). Append-only by convention: no update/delete RPC exists.

**`validate_record` v3** (copied from 202610210002 with these patches):
- `shippingFee` validation, and the fee is frozen once Shipped.
- `paid ≤ total + fee`.
- Paid: total ≤ paid ≤ total + fee. Shipped/Delivered: paid = total + fee.
- Typed or negative ledger entries only with `jastip.ledger`.
- Paid decrease only with `jastip.ledger`.
- Pricing, item and backwards changes only with `jastip.substitute`.
- Ledger-only append on Delivered only with `jastip.ledger`.

**Helpers** (private): `phone_key`, `credit_balance`, `order_write_begin/end`, `ledger_line`, `locked_order`, `save_order`, `move_stock`.

**RPCs:** `jastip_order_unavailable`, `jastip_order_refund`, `jastip_use_credit`, `jastip_substitute_order`, `jastip_buyer_credits`.

**Existing data:** no backfill. Orders without `shippingFee` behave as fee = 0.
