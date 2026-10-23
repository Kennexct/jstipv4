# DBA — landing-and-support-chat (2026-10-23)
**Migration:** `202610220001_support_chat.sql`. Additive only; it touches no existing tables or functions.

**Tables**
- `jastip.support_threads` (uuid pk, unique `token_hash`, name ≤60, contact ≤120, status Open|Closed|Blocked, `ip_hash`, timestamps, read markers).
- `jastip.support_messages` (identity pk, `thread_id` fk, sender visitor|admin, body 1–2000 after trim).
- RLS is on and all privileges are revoked.

**Indexes:** `support_messages(thread_id,id)` for polling after an id; `support_threads(last_message_at desc)` for the inbox. The inbox list is capped at 300 most recent.

**Functions**
- Private helpers: `jastip.chat_client/chat_thread/chat_body/chat_messages`.
- Public RPCs: `jastip_chat_start/send/poll` (anon + authenticated); `jastip_admin_chats/chat/chat_reply/chat_status` (authenticated, `is_admin()`).
- Every function has an explicit revoke, then grant.
- Core PG only: `gen_random_uuid`, `sha256`. No pgcrypto.

**Retention:** nothing is deleted. Rate-limit rows reuse `jastip.rate_limits` (self-cleaning).

**Apply:** run in the Supabase SQL Editor before deploying the frontend. If the frontend is deployed first, the widget says "Chat isn't set up yet" and the Inbox shows a callout.
