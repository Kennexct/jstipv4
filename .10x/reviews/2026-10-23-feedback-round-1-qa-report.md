# QA + security report — feedback round 1 (ADR-010)

Branch `feature/feedback-round-1`. Verified locally in containers (not yet on hosted Supabase/Vercel).

| Suite | Result |
|---|---|
| Unit (`npm test`) | 32/32 (new: region, amount, return credit, English templates) |
| Build | OK |
| SQL (`npm run test:db`) | 5/5 files PASS (new `sprint2b-feedback-settings.sql`) |
| E2E (`npm run test:e2e`) | 37/37 (9 new) |
| Integration | 5/5 |

## Security review
- New RPCs `jastip_settings`, `jastip_save_settings`, `jastip_return_credit`, `jastip_ship_orders` v2: SECURITY DEFINER, `search_path=''`, revoked from public/anon, granted to authenticated, role checked inside. Settings writes are Owner/Manager only; Helpers can read (no cost data in settings) and can add a courier only through shipping.
- Return credit: capped at net credit used, blocked once shipped/delivered/cancelled, ledger append-only (negative `credit-return` line), credit row appended; ordinary commits cannot add `credit-return` lines (tested).
- Courier names: 1–40 chars, no `<>`, unique case-insensitively, max 30.
- Calling code locked after buyer credit exists, so balances keep their keys.
- Client: Helpers do not see item status/bulk/copy controls, nor Add item/order/trip in the quick sheet. No new outbound sending; messages stay copy-only.

## Manual QA checklist (Kenny, after migration 202610250001)
1. Settings → Shipping & region: change country, see couriers/language suggestions, save; Helper sees read-only.
2. Ship an order with a saved courier, then with "+ Add new courier…" (untick tracking) — it appears in Settings.
3. Use credit on an order, then Return credit with a partial amount.
4. Add order on phone: tap a photo, type a past customer's name, use − / + and tap the quantity to retype.
5. Amount fields show 1.250.000 for IDR.
6. Items → List: change a status inline, select several and Set status. Copy an item to another trip.
7. Trips → Edit trip on an ongoing trip; currencies locked when it has items.
8. Phone and tablet (≤1100px): bottom-bar "+" opens Quick actions.

## Known limits
- Item status changes in bulk skip closed trips silently.
- Country "Other" stores code `ZZ`.
