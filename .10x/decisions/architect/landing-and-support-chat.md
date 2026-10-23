# Architect — landing-and-support-chat (2026-10-23) · ADR-007
**Components**
- `src/landing/Landing.jsx` (lazy): presentational sections and `ProductPreview` (tabs), using `sample.js`.
- `src/landing/ChatWidget.jsx`: visitor chat state machine (idle → form → thread → closed). Persists `{thread, token}` in localStorage (try/catch). Polls 5 s while open and 30 s while closed, only when the tab is visible.
- `src/landing/landing.css`: scoped under `.lp`.
- `src/live-workspaces.jsx` `AdminInbox`: thread list and conversation view, plus the RPC calls. Admin-only.
- `src/lib/repository.js`: `chatStart`, `chatSend`, `chatPoll`, `adminChats`, `adminChat`, `adminChatReply`, `adminChatStatus`.
- Migration `202610220001_support_chat.sql`: two tables and 7 RPCs.

**Routing:** `main.jsx` renders Landing when `page==='Home'`, or when signed out at the root with no invite, recovery or native platform.

**Boundaries:** chat data is platform-level and has no workspace id. It never touches `jastip.records` or `revision`.

**Failure modes**
- Migration missing: the widget shows "Chat isn't set up yet" and the inbox shows a callout.
- Rate limit: an inline error, and the draft is kept.
- Blocked or closed thread: the widget offers to start a new one.
- localStorage blocked: the chat works for the session only.
