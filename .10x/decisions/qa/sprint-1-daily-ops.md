# QA — sprint-1-daily-ops (2026-10-23)
| Suite | Result |
|---|---|
| Unit | 19/19 (+6 message tests) |
| Build | OK |
| DB | 3/3 files PASS; new `sprint1-messages-shipping.sql` covers 25 checks |
| E2E | 23/23 (+4 new; 1 updated because Shipped now asks for the resi) |
| Integration | 4/4 (ship via RPC on PostgreSQL, deep link shows the resi without the buyer name, templates persist) |

**Visual:** 390 px screenshots of Items, Orders (selected), Ship, Reminders, Settings → Messages and the checklist. No overflow (the sweep covers 5 widths).
**Bugs found and fixed during the sprint**
- Live-mode checkboxes blocked bulk actions.
- Enter in the item form would have triggered "add another".
- Ambiguous Done buttons in tests.

**Not verified:** hosted Supabase (migrations not applied), real phones, real clipboard on iOS Safari.
