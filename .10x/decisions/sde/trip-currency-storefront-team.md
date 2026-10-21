# SDE — trip-currency-storefront-team (2026-10-21)
- Currency per trip (ADR-003): money.js helpers, dialogs (trip selling currency, item/quote/payment/purchase/expense conversions to selling currency, labels), seller screens (currency switch on Overview/Reports/Purchasing, per-row currency on orders/items/trips), customers per-currency totals, storefront prices, Settings currency tab + workspace info.
- Storefront (ADR-004): 3 layouts (Marketplace, Trip showcase, Lookbook), curated palette, live preview in Settings, saved to `workspaces.storefront`.
- Team: trash button (remove member / cancel invite) with confirm, Edit email dialog for pending invites (resends email).
- Dashboard: emerald/orange accents, Subtle/Tinted style, account-synced preferences.
- Fixes: new trip auto-selected on Trips page; ConfirmDialog accepts custom text.
Tests: unit 10/10, build OK, SQL PASS (+16 assertions), e2e 14/14, integration 3/3 (new: SGD trip priced on client and accepted by server, buyer order in S$, storefront theme persists, edit/cancel invite, remove member).
Debt: per-trip rate editing only in Settings → Currency; no cross-currency consolidated reporting (by design).
