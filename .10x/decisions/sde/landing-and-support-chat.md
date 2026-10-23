# SDE — landing-and-support-chat (2026-10-23) · ADR-007
**Built**
- `src/landing/Landing.jsx` (lazy chunk 26.7 KB / 8.6 KB gz), `landing.css` (scoped `.lp`), `sample.js` (example rows priced with the real `margin()`), `ChatWidget.jsx`.
- `src/admin-inbox.jsx`: Inbox screen (filters Open/Closed/Blocked/All, thread view, reply, close/reopen, block/unblock, copy contact, unsaved-reply guard).
- `src/lib/chat.js` (RPC client, localStorage token, `useAdminUnread` sidebar badge) and `src/lib/chat-format.js` (pure helpers, unit-tested).
- Routing: `main.jsx` `wantsLanding()`. `#Home` always; the bare root when signed out, unconfigured, or loading with no stored session. Skipped in the APK, demo builds and invite/recovery links. `#SignIn` / `#SignUp` open the existing gate and are replaced by `#Overview` after sign-in. The auth card has an "About Bawa" link back.
- `store.jsx`: `Inbox` counts as a platform page in both the mode list and the reload list (the reload list matters for admins without a workspace).
- `@fontsource/space-grotesk` 600/700 (display headings; brand kit §4). Loaded only in the landing chunk.

**Deviations from spec**
- The call to action is "Get started", not "Start free": new workspaces start on paid Starter, so "free" would mislead. Plan buttons read "Start with <plan>". "Recommended" flag instead of an invented "Most chosen".
- The chat client is in `src/lib/chat.js` rather than `repository.js`, to keep it separate.
- `chat_client()` prefers `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` (security review).

**Tech debt**
- The dashboard JS grew by 8.5 KB raw / 3 KB gz (Inbox + chat client in the main chunk). It could be lazy-loaded later.
- Polling, not realtime.
- No owner notification for new chats.
