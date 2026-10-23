# DBA — sprint-1-daily-ops (2026-10-23)
**Migration:** `202610230001_sprint1_messages_shipping.sql`. Additive.

**Table:** `jastip.workspace_settings` (pk `workspace_id`, `messaging` jsonb < 20 KB). RLS on; privileges revoked.

**Functions**
- `jastip_messaging` (member read).
- `jastip_save_messaging` (Owner/Manager; whitelist of keys; length and format checks; audit).
- `jastip_ship_orders` (any member; ≤ 100 per batch; revision check; `validate_record` per order; atomic; one revision bump; audit).
- `jastip_track_order` replaced: `courier`, `resi` and `shippedAt` added; the rest is unchanged.

**Order record:** gains optional `courier`, `resi` and `shippedAt`. No backfill is needed.
**Apply:** in the Supabase SQL Editor, after `202610220001_support_chat.sql`.
