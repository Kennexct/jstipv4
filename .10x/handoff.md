# Handoff — 2026-10-21

Deploy order: (1) paste `supabase/migrations/202610210001_flexible_orders.sql` into the Supabase SQL Editor and run; (2) commit + push; (3) check GitHub Actions CI is green; (4) smoke test on Vercel: navigate menus (progress bar, no "Connecting" screen), open storefront in a private window (no workspace bar, trip cards), add a no-limit item with DP, buy a confirmed unpaid order from Purchasing.
Rules now: Purchased needs DP; Shipped/Delivered need full payment; no-limit items cap 20 per public order; item-linked orders can't change item/qty.
