# Jastip Ops — Memory Notes & Architectural Context

> **Note**: This file is maintained alongside [`MEMORY.md`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/MEMORY.md). Refer to [`MEMORY.md`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/MEMORY.md) for the complete reference specification.

## Quick Reference Summary

### 1. Project Purpose & Architecture
- **App**: Jastip Ops (`jastip-ops`) — React 19 + Vite 6 + Supabase (PostgreSQL 16 + Storage + Auth).
- **Connected Mode**: Pure database persistence, zero fake records, Security Definer RPCs only.
- **Demo Mode**: `VITE_ENABLE_DEMO=true` only. Loads fixtures strictly from `src/demo/fixtures.js`.

### 2. Core Directory Map
- `src/main.jsx`: App entry point, route dispatcher, keyboard shortcuts.
- `src/store.jsx`: OpsContext state provider, 30s background polling, revision checking.
- `src/seller.jsx`: Seller screens (Overview, Orders, Items, Requests, Trips, Purchasing, Reports, Customers).
- `src/workspaces.jsx`: Settings, Billing, Welcome onboarding, Storefront, Admin views.
- `src/dialogs.jsx`: Dialog modals, Detail drawers, Command Palette (`Ctrl+K`).
- `src/auth.jsx`: Authentication, ConnectionGate, invite link acceptance.
- `src/ui.jsx`: Shared atomic UI components and icons.
- `src/charts.jsx`: SVG data visualizations without heavy external libraries.
- `src/money.js`: Margin calculation, FX conversion, expense allocation logic.
- `src/data.js`: Plan definitions (Starter, Pro, Business) and platform metadata.
- `src/lib/repository.js`: Supabase RPC calls, signed URL generator, file uploads.
- `src/lib/supabase.js`: Supabase client and RPC wrapper with error handlers.
- `src/lib/records.js`: Workspace schemas, diff tracking (`changesBetween`), CSV escaping.
- `src/styles/tokens.css` & `app.css`: Design tokens and typography.
- `supabase/migrations/202610100001_operations.sql`: Database schema, private tables, Security Definer RPCs.
- `tests/`: Unit and Playwright integration tests.

### 3. Critical Invariants
1. **Zero Fake Records in Connected Mode**: Do not inject mock data or sample charts in connected mode.
2. **Private Tables & Security Definer RPCs**: Raw tables are inaccessible to the browser.
3. **Frozen Snapshots**: Quoted costs, FX rates, and purchase costs are frozen snapshots. Payment history is strictly append-only.
4. **Tenant Isolation & Helper Restrictions**: Helper role strictly omits financial markup/costs and budgets/invoices.
5. **Atomic Stock & Concurrency**: Stock reservation is atomic on the server; stale writes are rejected via revision checks.
6. **No External Sending Tools**: WhatsApp and invite messages are copied for manual user sending.
7. **Post-Signup Walkthrough**: Automatically directs new users after workspace creation to `#Welcome` to configure shop details, first trip, and first find.

### 4. Android Packaging (Capacitor & GitHub Actions)
- Capacitor config: [`capacitor.config.json`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/capacitor.config.json) (`com.jastipops.app`).
- Automated Cloud Builder: [`.github/workflows/build-apk.yml`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/.github/workflows/build-apk.yml) builds debug APK (`jastip-ops-debug.apk`) on GitHub Actions.
- Local scripts: `npm run cap:build` and `npm run cap:open`.
