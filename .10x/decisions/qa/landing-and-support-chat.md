# QA — landing-and-support-chat (2026-10-23)
**Result (this container; not yet hosted):**
| Suite | Result |
|---|---|
| Unit | 13/13 (+3 chat helpers) |
| Build | OK |
| `test:db` | both files PASS (new `supabase/tests/support-chat.sql`; the runner now executes every file in `supabase/tests`) |
| E2E | 19/19 (+3; overflow sweep now covers `Home` and `Inbox` at 5 widths) |
| Integration | 4/4 (+1: full visitor ↔ admin round trip on real PostgreSQL) |

**Coverage**
- Landing: hero math (Rp 1.586.000 / 12.7%), the "Example data" label, preview tabs, plan prices from `planDetails`, in-page scrolling keeps the route, FAQ, Get started → sign-up → About Bawa → back.
- Chat: corner position, Esc closes and returns focus, demo notice, start/send/poll, 64-char token saved, unread badge appears then clears on open, reply reaches the visitor by polling, block → visitor sees closed → new conversation.

**Bugs found and fixed during verification**
- Admins without a workspace hit onboarding at `#Inbox` (store reload list).
- Prices wrapped and tabs were clipped on phone.
- Overstated copy ("Start free", "Most chosen", tax note, purchasing rule).

**Visual:** desktop, phone and dark screenshots checked; no horizontal overflow at 390 px.

**Not verified:** hosted Supabase (migration not applied), Vercel, real phones. Note: the local DB/integration run used a local PostgreSQL 16 stand-in for docker (CI uses the docker image).
