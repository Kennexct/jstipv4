# Handoff — 2026-10-21

Deploy order: (1) paste `supabase/migrations/202610210001_flexible_orders.sql` into the Supabase SQL Editor and run; (2) commit + push; (3) check GitHub Actions CI is green; (4) smoke test on Vercel: navigate menus (progress bar, no "Connecting" screen), open storefront in a private window (no workspace bar, trip cards), add a no-limit item with DP, buy a confirmed unpaid order from Purchasing.
Rules now: Purchased needs DP; Shipped/Delivered need full payment; no-limit items cap 20 per public order; item-linked orders can't change item/qty.

## 2026-10-21 — bawa-rebrand (to SDE, after approval)
Read `.10x/specs/2026-10-21-bawa-rebrand-design.md`, ADR-005, `docs/brand/BRAND.md`. Task order is in `decisions/engineering-manager/bawa-rebrand.md`. No migration. Do not rename `jastip` schema/RPCs/appId.

## 2026-10-21 14:50 — bawa-rebrand shipped to the branch
Push, then check: CI "Validate Bawa" green; "Build Android APK" run green (new icon step) → install `bawa-debug.apk`; on Vercel: tab icon, sidebar logo, Settings → Appearance → System theme with phone in dark mode, storefront footer. Optional: set VITE_PUBLIC_APP_URL in Vercel for WhatsApp previews. Still open before public launch: PDKI + domain check.

## 2026-10-23 — landing-and-support-chat (to SDE)
Read the spec + ADR-007. The task order is in `decisions/engineering-manager/landing-and-support-chat.md`. New migration `202610220001_support_chat.sql` (additive). Landing at `/` (signed out) and `#Home`; chat bottom-right; admin Inbox tab.

## 2026-10-23 — landing-and-support-chat built (to Kenny / DevOps)
Branch `feature/landing-and-support-chat`. Deploy order in `decisions/devops/landing-and-support-chat.md`. The migration must run before the chat works. Smoke checklist in `reviews/2026-10-23-landing-qa-report.md`. Follow-ups: privacy-policy line for chat contacts; owner alerts for new chats (not built).

## 2026-10-23 — sprint-1-daily-ops (to SDE)
Spec `specs/2026-10-23-sprint-1-daily-ops-design.md`, ADR-008, task order in `decisions/engineering-manager/sprint-1-daily-ops.md`. New migration `202610230001_sprint1_messages_shipping.sql`.

## 2026-10-23 — sprint 1 built (to Kenny / DevOps, then sprint 2 PM)
Deploy order in `decisions/devops/sprint-1-daily-ops.md`. Sprint 2 starts with a spec for out-of-stock/substitute plus buyer refunds on the existing payment ledger (Kenny: same ledger).

## 2026-10-23 — sprint 2 (to DBA first)
Start with the migration and `validate_record` v3; run the full SQL suite before any UI work. Spec `specs/2026-10-23-sprint-2-money-and-stock-design.md`, ADR-009.

## 2026-10-23 — sprint 2 built (to Kenny, then sprint 3 PM)
Deploy order in `decisions/devops/sprint-2-money-and-stock.md`. Sprint 3 starts with brainstorming "Close the trip" (FX actually paid, final costs, unpaid, refunds → one-page recap).
