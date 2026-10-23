# Sprint 2: shopping-day surprises and money

**Date:** 2026-10-23 (sprint window 9–20 Nov) · **Slug:** `sprint-2-money-and-stock` · **ADR:** 009 · **Approved:** Kenny, 23 Oct 16:26

**Kenny's choices**
- Out of stock: the seller chooses refund or credit each time.
- Substitute: edit the same order.
- Ongkir: typed per order after packing.
- Price change: show the margin hit only.

## Scope
1. **Can't buy this** (order drawer and checklist line; Owner/Manager).
   - Before purchase only.
   - Cancels the order, restores stock, and records a ledger line of −paid (refund or credit).
   - Credit goes to the buyer's balance.
   - Copy the "Unavailable" template.
2. **Substitute** (Owner/Manager; status Confirmed or Paid).
   - Step 1: the new item (catalog or custom name), unit price, estimated unit cost and qty. Copy the "Substitute" message.
   - Step 2: "Buyer agreed → apply" goes through one RPC that:
     - changes item, qty, total, quotedCost, allocation and deposit
     - appends to `substitutions[]` the old item/qty/total, the new values, the note and the date
     - moves catalog stock from the old item to the new one
   - Excess paid over the new total becomes a refund or credit line.
   - If paid < the new total and the status is Paid, the status returns to Confirmed.
3. **Refund or credit** (any non-cancelled order with paid > 0, including Delivered; Owner/Manager): partial amount ≤ paid, with a note.
4. **Use credit** (any member, like recording a payment): amount ≤ min(balance, amount due). It is added to the ledger as `type: credit-use`.
5. **Ongkir:** `shippingFee` on the order, editable by Owner/Manager until Shipped.
   - Amount due = total + ongkir − refunds and credits.
   - "Full payment" checks *received* (the sum of positive entries) = total + ongkir.
   - Reminders include ongkir; new placeholder `{ongkir}`.
   - Ongkir is excluded from profit.
6. **Margin hit:** the purchase dialog shows the quoted vs actual margin and warns when it drops. The drawer and Reports flag the orders whose actual cost exceeds the quoted cost.
7. **Needs-me-today** panel at the top of Overview, with 5 queues and one action each:
   - quote requests
   - DP overdue > 2 days
   - ready to buy
   - ready to ship
   - shipped > 7 days ago and not delivered
8. **Storefront cards:** "PO closes in N days" / "Closes today" from the item deadline.
9. **Phone:** the checklist trip filter at a readable width.

## Data (migration `202610240001_sprint2_money_and_stock.sql`)
- `jastip.buyer_credits(id, workspace_id, phone, amount ±, kind issue|use, order_id, note, created_by, created_at)`. Append-only, RLS on, privileges revoked.
- `jastip.validate_record` is replaced by a copy with these changes:
  - `shippingFee` is validated (≥ 0, frozen once Shipped).
  - "full payment" uses received = total + fee.
  - Typed ledger entries (`refund`, `credit`, `credit-use`) and decreases of paid are allowed **only** when the transaction flag `jastip.ledger` is set by our RPCs.
  - Pricing, item and backwards-status changes are allowed only when `jastip.substitute` is set.
  - A ledger-only append is allowed on a Delivered order under `jastip.ledger`.
  - Normal commits: new payment entries must be positive and untyped.
- **RPCs:** `jastip_order_unavailable`, `jastip_order_refund`, `jastip_substitute_order`, `jastip_use_credit` and `jastip_buyer_credits` (balances).

## Tests
- **SQL:**
  - ledger rules on both paths
  - the flag can't be set through commit
  - unavailable: refund and credit, stock restored
  - partial refund on a delivered order
  - substitute (catalog and custom; excess paid as credit; stock)
  - use credit: balance and amount-due caps
  - ongkir: full payment and frozen after Shipped
  - Helper denials
- **Unit:** the order-action mirror, payment state with ongkir and refunds.
- **E2E (demo):** each dialog, the queue, the deadline label.
- **Integration:** unavailable → credit → use credit on a new order, on PostgreSQL.
