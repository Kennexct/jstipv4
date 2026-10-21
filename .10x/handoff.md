# Handoff — 2026-10-21

Deploy order: (1) paste `supabase/migrations/202610210001_flexible_orders.sql` into the Supabase SQL Editor and run; (2) commit + push; (3) check GitHub Actions CI is green; (4) smoke test on Vercel: navigate menus (progress bar, no "Connecting" screen), open storefront in a private window (no workspace bar, trip cards), add a no-limit item with DP, buy a confirmed unpaid order from Purchasing.
Rules now: Purchased needs DP; Shipped/Delivered need full payment; no-limit items cap 20 per public order; item-linked orders can't change item/qty.

## 2026-10-21 — bawa-rebrand (to SDE, after approval)
Read `.10x/specs/2026-10-21-bawa-rebrand-design.md`, ADR-005, `docs/brand/BRAND.md`. Task order is in `decisions/engineering-manager/bawa-rebrand.md`. No migration. Do not rename `jastip` schema/RPCs/appId.

## 2026-10-21 14:50 — bawa-rebrand shipped to the branch
Push, then check: CI "Validate Bawa" green; "Build Android APK" run green (new icon step) → install `bawa-debug.apk`; on Vercel: tab icon, sidebar logo, Settings → Appearance → System theme with phone in dark mode, storefront footer. Optional: set VITE_PUBLIC_APP_URL in Vercel for WhatsApp previews. Still open before public launch: PDKI + domain check.
