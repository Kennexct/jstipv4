# EM — landing-and-support-chat (2026-10-23)
Tasks in order, each about half a day or less:
1. Migration + `supabase/tests/support-chat.sql` + test runner picks up all test files. *Risk: header access in the test container. Mitigation: `current_setting(...,true)` returns null there.*
2. Repository functions + test transport args (`scripts/test-supabase-server.mjs`).
3. Landing sections + sample data + CSS (desktop/tablet/phone, light/dark).
4. ChatWidget.
5. Routing in `main.jsx` / `auth.jsx` (Sign in/up hash) + `store.jsx` admin page list.
6. AdminInbox + nav entry + unread badge.
7. E2E + integration tests; screenshots; QA/security review.

**Dependency:** Kenny applies the migration in the Supabase SQL Editor before deploying. The landing page works without it, but the chat would show "not set up yet".
