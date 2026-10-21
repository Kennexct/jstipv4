# SDE — trip-status-view (2026-10-21)
Small UI change, no data/RPC change (no ADR needed).
- Trip cards on Trips now show their status badge (was hidden by `.trip-selector .badge { display: none }`).
- Filter chips with counts: All · Active · Planning · Open for orders · Closed. Cards sorted Shopping → Open for orders → Delivering → Planning → Closed, newest start first.
- Closed trips: lock icon, muted card, gray badge. Planning badge is violet (was gray, same as Closed).
- Badge tone change in `src/ui.jsx`: "Closed" is no longer green (also affects merchant status "Closed" → gray).
- Cards wrap in a grid instead of squeezing into one row.
Tests: e2e "trips show their status and can be filtered…" + full e2e 9/9, unit 10/10, build OK.
