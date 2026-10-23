# SDE — sprint-1-daily-ops (2026-10-23) · ADR-008
**Built**
- `src/lib/messages.js`: templates, placeholders, Indonesian defaults, courier list, ship eligibility. Unit-tested.
- `src/messages-settings.jsx`: the Settings → Messages tab (bank account, 4 templates, live preview, placeholder list, restore defaults; Helpers read-only).
- `src/ops-dialogs.jsx`: Ship dialog (single or bulk, skipped-with-reason list, copy shipped message per buyer afterwards) and Reminders dialog (one Copy per unpaid buyer).
- `src/store.jsx`: `messaging`, `saveMessaging`, `shipOrders`. Choosing "Shipped" in the order drawer now opens the Ship dialog.
- Order drawer copies use the templates; "Shipped message" appears once shipped; "Shipped with" row with Edit.
- Tracking: the dialog shows courier, resi and ship date; `#Storefront/<slug>/track/<token>` auto-opens it.
- Orders bulk bar: Copy reminders, Mark shipped, Export. **Behaviour change:** every order can now be selected (before, only Requested/Quoted in live mode). "Confirm orders" still only confirms Requested/Quoted, and says how many.
- Item form: "Post and add another" (a type=button that calls `requestSubmit`, so Enter still posts and closes).
- Phone CSS: 2-column items at ≤ 900 px; two-line order cards at ≤ 640 px; fading status tabs; checklist grid rows; sticky selection bar.

**Deviations from spec:** none in scope. Also tidied the checklist meta to "Qty 2 · name · id".
**Tech debt**
- Dashboard JS grew from 452 to 459 KB raw (+2 KB gz).
- The Purchasing trip filter select is still narrow on phones (pre-existing; queued for sprint 2).
