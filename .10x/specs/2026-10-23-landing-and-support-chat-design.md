# Landing page + quick support chat — design

**Date:** 2026-10-23 · **Feature slug:** `landing-and-support-chat` · **ADR:** 007 · **Approved by:** Kenny (2026-10-23 13:39)

## Goal
A visitor who opens Bawa without an account should understand what Bawa is, see how it works (sample data), see the plan prices and be able to ask a question. The question has to reach the platform owner in the admin console, and the owner's reply has to come back in the same chat.

## Decisions taken in brainstorming
- **Chat model:** two-way chat. Visitor messages appear in a new admin **Inbox** and the owner's replies show in the visitor's popup.
- **Placement:** the root URL shows the landing page when the visitor is signed out. `#Home` always shows it. Signed-in users, invite links, storefront links, recovery and the APK never land on it automatically.
- **Chat button:** a floating button in the **bottom-right** corner.

## 1. Routing
`main.jsx` decides in this order:
1. In the Android app (`Capacitor.isNativePlatform()`), keep today's behaviour and skip the landing page.
2. `page === 'Home'` → `<Landing/>`, in every mode including demo.
3. `!demoMode && connection === 'signedout' && route is empty/Overview && no pending invite && not recovery` → `<Landing/>`.
4. Otherwise behaviour is unchanged.

`Sign in` sets `#SignIn` and `Start free` sets `#SignUp`. Both render the existing `ConnectionGate`, which already reads `#SignUp`. The landing page lives in `src/landing/` and is loaded with `React.lazy`, so the dashboard chunk does not grow.

## 2. Page sections
1. Top bar: Bawa lockup, anchor links (How it works · Features · Pricing · FAQ), Sign in, Start free.
2. Hero: "Your jastip business, in order." with the kicker "Found there. Brought home." A worked item card shows ¥12,800 × rate 105 + Rp 40k trip-cost share + 20% markup, giving the selling price and the margin.
3. Problem → solution: the before (chats, notes, spreadsheets) and the after (one list per trip, honest margins).
4. **See how it works:** a tabbed product preview with Items · Orders · Purchasing · Storefront, built from static rows in `src/landing/sample.js` and labelled **"Example data"**. These rows never reach any workspace and are not part of `src/demo/`.
5. Features: solo seller / team / buyer (6 feature cells).
6. Pricing: three cards read from `planDetails` (`src/data.js`). A note says invoices are manual and no card is needed.
7. FAQ (5 Q&As, using `<details>`), the final call to action, and the footer.

Design: existing tokens, Geist, hairline borders and one accent. It works in light and dark and at desktop, tablet and phone widths. There is no stock imagery and no fake testimonials, logos or user counts.

## 3. Chat widget (visitor)
- The bottom-right button opens a panel (a dialog with a focus trap and Esc to close).
- **First message:** name (required, ≤60), contact (optional email or WhatsApp, ≤120), message (1–2000). It calls `jastip_chat_start`, which returns `{thread, token}`. The widget stores `{thread, token}` in `localStorage['bawa-chat']` inside try/catch.
- **Conversation:** messages are rendered as plain text. `jastip_chat_send(thread, token, body)`.
- **Polling:** `jastip_chat_poll(thread, token, after)` every 5 s while the panel is open and every 30 s while it is closed. Polling only runs while the tab is visible. An unread dot shows on the button.
- **Copy:** "We usually reply within a day. Leave your email or WhatsApp in case you close this page." There is no online indicator.
- **Closed or blocked thread:** the widget shows "This conversation is closed" and offers "Start a new conversation".
- **No Supabase (demo or unconfigured):** the panel explains that chat is available on the live site.

## 4. Admin Inbox
- An admin nav entry **Inbox** (icon `MessageCircle`) sits between Moderation and Audit, with an unread badge.
- The left column lists threads (name, last message, time, status). The right side shows the conversation, the contact with a Copy button, and a reply box.
- Actions: reply, Close and Reopen, and Block. Opening a thread marks visitor messages as read.
- It refreshes every 15 s while open and also on the existing 30 s quiet refresh.
- In demo mode it shows an empty state that says the inbox needs the live database.

## 5. Data (migration `202610220001_support_chat.sql`, additive)
```
jastip.support_threads(id uuid pk, token_hash text unique, name, contact, status Open|Closed|Blocked,
  created_at, last_message_at, admin_read_at, ip_hash)
jastip.support_messages(id bigint identity pk, thread_id fk, sender visitor|admin, body 1..2000, created_at)
```
- RLS is on and all access is revoked. Only RPCs touch these tables.
- Anonymous RPCs (`anon, authenticated`): `jastip_chat_start(p_name,p_contact,p_body)`, `jastip_chat_send(p_thread,p_token,p_body)`, `jastip_chat_poll(p_thread,p_token,p_after)`.
- Admin RPCs (`authenticated` + `is_admin()`): `jastip_admin_chats()`, `jastip_admin_chat(p_thread)`, `jastip_admin_chat_reply(p_thread,p_body)`, `jastip_admin_chat_status(p_thread,p_status)`.
- **Token:** two v4 UUIDs as 64 hex characters (244 random bits) is returned once. Only the sha256 hash is stored. Every visitor call compares hashes.
- **Rate limits** (`jastip.limit_request`): `chat-ip:<hash>` 5 new threads per 10 min, `chat-global` 200 new threads per 10 min, `chat-thread:<id>` 20 visitor messages per 10 min. The IP comes from `request.headers` x-forwarded-for when present. Only its hash is stored and used in bucket names.
- Nothing is ever deleted. Closed and blocked threads stay for audit. Admin actions write to `jastip.audit`.

## 6. Error handling
- Server errors come back as plain messages ("Too many requests…", "This conversation is closed."). The widget shows them inline and keeps the draft.
- A missing migration (PGRST202) shows "Chat isn't set up yet."

## 7. Testing
- `supabase/tests/support-chat.sql`, run by `test:db`:
  - start, send and poll work for a visitor
  - a wrong token is rejected
  - a non-admin cannot list or reply
  - an admin can list, reply and block
  - a blocked thread rejects sends
  - the length limits hold
  - the rate limit trips
  - no table access for anon
- E2E (demo):
  - the landing page renders at `#Home` with all sections and the three plan prices
  - Start free goes to sign-up
  - the chat panel opens and closes with Esc
  - the Inbox nav exists in the admin console
- Integration (real PostgreSQL):
  - signed out at `/` shows the landing page
  - the visitor sends a chat message
  - the admin sees it in the Inbox and replies
  - the visitor sees the reply

## Out of scope
- Chat for signed-in merchants inside the dashboard.
- Email or push alerts to the owner about new chats.
- Attachments.
- Realtime websockets (polling is enough at this volume).
