# QA report — sprint 1 daily ops (2026-10-23)
**Verdict:** ready for review and deploy after both migrations. All local suites pass:
- unit 19/19
- db 3/3
- e2e 23/23
- integration 4/4

**Smoke test on Vercel after deploy**
1. Settings → Messages: save the bank details; Copy quote shows the bank line.
2. Ship a paid, purchased order with JNE and a resi.
3. Copy the shipped message; open its link in a private window; the resi shows.
4. Select 5 orders: Copy reminders lists only the unpaid ones; Mark shipped skips the ineligible ones with reasons.
5. Add item → Post and add another.
6. On a phone: Items in 2 columns, two-line order cards.
