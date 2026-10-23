# Sprint 1: daily ops (phone fixes, messages, resi, bulk, post-and-add-another)

**Date:** 2026-10-23 · **Feature slug:** `sprint-1-daily-ops` · **ADR:** 008 · **Source:** doc "Bawa from a jastiper's seat" (Delivery plan, sprint 1)
**Kenny's answers (23 Oct):**
- `wa.me` counts as outbound, so messages stay copy-only and "Open in WhatsApp" is dropped.
- Refunds go on the same payment ledger (sprint 2).
- Interviews with sellers are confirmed before the offline and Indonesian-interface work.

## Scope
1. **Phone layout fixes** at ≤ 760 px:
   - Items: two cards per row; no truncated badges or wrapping prices.
   - Orders: compact cards; the status tabs scroll with a visible fade.
   - Purchase checklist: the meta line runs at full width under the item name.
2. **Message templates.**
   - Settings → Messages: edit four templates (quote, payment reminder, status update, shipped) and the bank account (bank, number, holder).
   - The defaults are in Bahasa Indonesia.
   - Placeholders: `{nama} {item} {qty} {total} {dp} {sisa} {status} {order} {rekening} {kurir} {resi} {link_lacak}`.
   - The order drawer's Copy buttons use the saved templates, plus a new "Copy shipped message".
   - Owner and Manager can edit; Helpers read.
3. **Courier and resi on Shipped.**
   - "Mark shipped" asks for the courier (JNE, J&T, SiCepat, AnterAja, Ninja, POS, GoSend, GrabExpress, Pickup, Other) and the resi (optional for Pickup or GoSend).
   - The server sets status Shipped, `courier`, `resi` and `shippedAt` atomically, and the existing rules apply (purchased + fully paid).
   - The buyer tracking page shows the courier and resi.
   - A tracking deep link `#Storefront/<slug>/track/<token>` opens the tracking result directly; it fills `{link_lacak}`.
4. **Post and add another.** The item form gets a second button, "Post and add another". It keeps trip, currency, rate, markup, DP and category, and clears the name, price, qty and photos.
5. **Bulk actions on Orders.**
   - The selection bar adds "Copy reminders": one message per unpaid selected buyer, shown in a list with a Copy button each.
   - It also adds "Mark shipped": one courier for all, resi per order. Ineligible orders are skipped and the reason is shown.

## Data (migration `202610230001_sprint1_messages_shipping.sql`, additive)
- `jastip.workspace_settings(workspace_id pk, messaging jsonb, updated_at)`: RLS on, privileges revoked.
- `jastip_messaging(p_workspace)` lets any member read.
- `jastip_save_messaging(p_workspace, p_value)` is Owner/Manager only, with validation:
  - templates ≤ 1000 characters
  - bank name ≤ 40 characters
  - account number: digits, spaces and dashes, ≤ 30
  - holder ≤ 80 characters
- **`jastip_ship_orders(p_workspace, p_revision, p_shipments jsonb[≤100])`:**
  - Any member, including Helpers, can call it.
  - For each shipment it builds `old || {status:'Shipped', courier, resi, shippedAt}` and runs `jastip.validate_record` with role 'Manager', so all order rules apply but the Helper field lock does not block these three fields.
  - It bumps the revision once, writes an audit entry, and returns `jastip_load_workspace`.
  - The batch is atomic.
- `jastip_track_order` is replaced to also return `courier`, `resi` and `shippedAt`. It still returns no buyer identity.

## Not in scope
- Open in WhatsApp (dropped).
- Out of stock and refunds (sprint 2).
- Offline mode.

## Tests
- **SQL:**
  - templates: role rules and validation
  - ship: needs Purchased + full payment; a Helper can ship
  - batch atomicity, revision check
  - tracking shows the resi and no identity
- **E2E (demo):** templates are saved and used in a copy, Mark shipped with resi, bulk reminders list, post and add another, no overflow at 390 px.
- **Integration:** ship on PostgreSQL, then the tracking deep link shows the resi.
