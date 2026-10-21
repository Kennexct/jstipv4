# SDE — flexible-orders (2026-10-21)
Built: quiet navigation reloads + loader/progress bar; storefront without workspace bar, trip cards and trip-grouped grid, dynamic categories; no-limit qty + DP fields on items; DP on quotes; payment badge; buy-before-paid; Purchasing recap (Confirmed+Paid+Purchased, recap by item, CSV); sidebar plan under workspace and sign out at the bottom.
Crash/edge fixes: drawer ReferenceError (`initial`), manual order defaulting to a Draft item, editing a sold-out item silently reset qty to 1, payments on purchased orders tried to move status back to Paid, request button with no open trips, hardcoded storefront categories hid items.
Tests: unit 10/10, e2e 8/8, SQL suite + 14 flexible-order assertions, connected integration incl. DP/no-limit flow — all pass locally (Postgres 16).
Debt: workspace-wide revision lock still causes conflicts under buyer traffic (review #4).
