# JASTIP OPS - SYSTEM MEMORY & ARCHITECTURE NOTES
> **PERSISTENT CONTEXT FILE**: This document serves as the single source of truth for the Jastip Ops codebase architecture, design system, database contracts, security invariants, and workflows. Consult this file on every prompt to preserve project integrity without requiring repetitive re-contextualization.

---

## 1. Project Overview & Identity
- **Project**: Jastip Ops (`jastip-ops`)
- **Domain**: Jasa Titip (proxy shopping / personal shopper) operations platform serving sellers (merchants), buyers (account-free storefront), team members (collaborators), and platform administrators.
- **Tech Stack**:
  - **Frontend**: React 19 (`^19.1.0`), Vite 6 (`^6.4.4`), `@fontsource/geist`, `@fontsource/geist-mono`, `lucide-react`
  - **Backend / Database**: Supabase (`@supabase/supabase-js ^2.117.3`), PostgreSQL 16 with custom `jastip` schema & Security Definer RPCs, Supabase Storage
  - **Styling**: Pure CSS Custom Properties / Tokens (`src/styles/tokens.css`, `src/styles/app.css`) — neutral flat panels, Geist typography, responsive layout
  - **Testing**: Node test runner (`node --test`), Playwright (`@playwright/test ^1.56.0`), isolated Docker PostgreSQL 16 container for database suites

---

## 2. Execution Modes (Strict Invariant)
The application operates in two strictly separated modes:
1. **Connected Mode (Default)**:
   - Backed by live Supabase Auth, PostgreSQL RPCs, and Storage.
   - **Zero fabricated/fake data**: Blank workspaces start completely empty (`emptyWorkspace()`).
   - All mutations must be confirmed by the database before updating the UI.
   - Direct raw table access is forbidden; all reads and writes use Security Definer RPCs.
2. **Demo Mode (Opt-in Only)**:
   - Enabled **only** when `VITE_ENABLE_DEMO=true`.
   - Loads mock fixtures exclusively from `src/demo/fixtures.js`.
   - Persists state to `localStorage['jastip-ops-demo-v1']`.
   - **Rule**: Never leak demo fixtures, simulated checkout, or fake business records into connected mode.

---

## 3. Directory & File Structure

```
jstipv4/
├── .github/workflows/          # CI pipeline (lint, test, build, database & integration tests)
├── docs/                       # Project documentation & reference specs
│   ├── design-and-coverage.md  # Detailed feature coverage & boundaries
│   ├── design-taste.md         # UI/UX design guide (typography, spacing, tone)
│   ├── supabase-setup.md       # Migration guide, Auth callbacks, Storage policies
│   └── references/             # Original PRD and historical mockup references
├── scripts/                    # Automation and test runners
│   ├── export-mockup.mjs       # Mockup screenshot exporter
│   ├── test-database.mjs       # Local Docker PostgreSQL 16 test harness
│   └── test-supabase-server.mjs# Integration RPC test server
├── src/                        # Frontend source code
│   ├── auth.jsx                # Login, Signup, Reset Password, Connection Gate, Invite flow
│   ├── charts.jsx              # SVG data visualizations (neutral, lightweight, dependency-free)
│   ├── data.js                 # Plan details (Starter, Pro, Business) and platform metadata
│   ├── dialogs.jsx             # Dialog modals, Detail drawers, Command Palette (`Ctrl+K`)
│   ├── live-workspaces.jsx     # Live workspace coordination
│   ├── main.jsx                # Entry point, app shell, route dispatcher, keyboard shortcuts
│   ├── money.js                # Currency conversion, profit margins, cost allocation algorithms
│   ├── seller.jsx              # Merchant screens (Overview, Orders, Items, Requests, Trips, Purchasing, Reports, Customers)
│   ├── store.jsx               # OpsContext Provider, state lifecycle, revision sync, background polling (30s)
│   ├── ui.jsx                  # Shared atomic UI components (Button, Avatar, Empty, Header, Progress, Icons)
│   ├── workspaces.jsx          # Settings, Billing, Welcome onboarding, Storefront, Admin views
│   ├── demo/
│   │   └── fixtures.js         # Fixtures strictly for demo mode preview
│   ├── lib/
│   │   ├── records.js          # Workspace schema definition, `changesBetween` diffing, CSV sanitization
│   │   ├── repository.js       # Client RPC calls, image upload, signed URL generator
│   │   └── supabase.js         # Supabase client instantiation, RPC wrapper with error translation
│   └── styles/
│       ├── app.css             # Main layout, components, utility classes, animations
│       └── tokens.css          # Design tokens (colors, accents, density, radii, shadows, motion)
├── supabase/
│   ├── migrations/
│   │   └── 202610100001_operations.sql # Additive PostgreSQL schema, RLS, Security Definer RPCs
│   └── tests/
│       └── security-and-workflows.sql  # SQL assertions for tenant isolation, RBAC, snapshots
├── tests/                      # Unit and integration test suites
│   ├── database.integration.js # Connected app tests against local containerized PostgreSQL
│   ├── money.test.js           # Pricing, margins, FX, and expense allocation tests
│   ├── records.test.js         # Empty workspace assertions, diff tracking, CSV escaping
│   └── workflows.spec.js       # Playwright responsive layout & core user journeys
├── AGENTS.md                   # Agent system rules (automatically loaded in agent context)
├── MEMORY.md                   # This persistent context file
├── memory-notes.md             # Direct reference / mirror for user-friendly navigation
├── package.json                # Project dependencies and script declarations
├── playwright.config.js        # Playwright configuration for e2e workflow tests
└── vite.config.js              # Vite bundler configuration
```

---

## 4. Database & Security Architecture

### Schema: `jastip`
- `jastip.workspaces`: Workspace entities (name, slug, bio, plan, status, trial_ends_at, revision, created_at).
- `jastip.members`: Multi-tenant membership mapping (`workspace_id`, `user_id`, `role: 'Owner' | 'Manager' | 'Helper'`).
- `jastip.platform_admins`: Superusers with administrative / platform operator rights.
- `jastip.records`: Primary JSONB document store partitioned by `(workspace_id, kind, id)`.
  - Allowed `kind`: `'items' | 'orders' | 'trips' | 'budgets' | 'customers' | 'notes' | 'invoices' | 'reports'`
- `jastip.invitations`: Email invitations with secret IDs for workspace onboarding.
- `jastip.audit`: Immutable audit log of administrative and operational events.
- `jastip.rate_limits`: Database-level rate limiting for public storefront actions.

### Storage Buckets
- `jastip-products`: Public read bucket. Stores product photos uploaded by merchants.
- `jastip-proofs`: Private bucket. Stores payment slips and expense receipts. Accessible **only** via short-lived signed URLs (60 seconds) generated by authorized users.

### Security Definer RPCs
Raw business tables are strictly private (`revoke all on schema jastip from public, anon, authenticated`). All interactions execute through security-definer functions with `set search_path=''`:
- `jastip_load_workspace(p_workspace)`: Loads workspace records, auditing, choices, and members.
  - **Helper Restriction**: If user role is `Helper`, sensitive financial fields (`cost`, `price`, `markup`, `allocation`, `rate`, `markupMode` on items; `quotedCost`, `actualCost`, `fxRate` on orders) are automatically stripped from JSON payloads, and budgets/invoices return empty.
- `jastip_commit(p_workspace, p_revision, p_changes, p_shop, p_event)`: Atomic transactional mutation.
  - Rejects stale writes if `p_revision != workspaces.revision`.
  - Increments workspace revision on success.
- `jastip_storefront(p_slug)`: Public catalog read. Omits margins, wholesale costs, trip expenses, and buyer info.
- `jastip_place_order(p_slug, p_order)`: Public checkout. Server verifies price calculation and atomically reserves item stock. Generates private random tracking token.
- `jastip_track_order(p_token)`: Public order tracking by private token. Returns order status and item summary without exposing customer identity.
- `jastip_invite_member(p_workspace, p_email, p_role)`: Owner creates an invitation link.
- `jastip_accept_invitation(p_invitation)`: Verifies user email matches invitation before granting membership.
- `jastip_admin_action(p_workspace, p_action, p_value)`: Platform-level actions (plan upgrade, trial dates, suspension, notes).

---

## 5. Domain Invariants & Business Logic

1. **Frozen Snapshots**:
   - Quoted item prices and costs are snapshotted on orders at creation time. If item catalog pricing changes later, existing order profit calculations remain unchanged.
   - When actual purchases occur, actual purchase costs and FX rates are frozen separately.
2. **Append-Only Payment Ledger**:
   - Order payments cannot be mutated or deleted. Each payment record appends to `order.payments` with proof references, timestamps, and amounts.
3. **Optimistic Locking & Record Diffing**:
   - `changesBetween(previous, next)` calculates delta.
   - Deletion of records is forbidden (`throw Error('Record removal is not supported. Archive or cancel the record instead.')`). Records are marked archived or cancelled.
4. **Third-Party Messaging & Integration Boundaries**:
   - No external WhatsApp API gateway or automated messaging. WhatsApp notifications and invite links are copied to the user's clipboard for manual transmission.
   - Subscription billing is handled via manual invoices and platform admin activation.
5. **Post-Signup Onboarding & Walkthrough Flow**:
   - Following account creation and workspace initialization (`jastip_create_workspace`), the system automatically routes the user to the interactive Walkthrough (`#Welcome`).
   - The 3-stage walkthrough guides merchants through:
     1. Setting workspace identity: shop name, bio, WhatsApp customer contact, and base currency.
     2. Setting up their first shopping trip (destination, dates, budget).
     3. Adding their first find with real-time pricing and margin calculation.
   - Fresh workspaces on Overview display a dedicated walkthrough launcher card until the first trip and find are established.

6. **Flexible orders (2026-10-21, migration `202610210001_flexible_orders.sql`)**:
   - Items may have **no stock limit** (`unlimited: true`, `qty` 0). Stock is never reserved or restocked for them; public orders are capped at **20 per order** (`MAX_UNLIMITED_PER_ORDER`).
   - Items and quotes may require a **down payment**: `depositMode` `none | percent | amount`, `depositValue` (percent of order total, or Rp per unit). Orders store a frozen `deposit` (Rp), computed by the server for item orders (`jastip.deposit_for`) and mirrored in `src/money.js#depositFor`.
   - **Buy before payment**: `Confirmed → Purchased` is allowed once `paid ≥ deposit`. `Paid`, `Shipped` and `Delivered` require full payment. Payments on purchased orders never move the status back to `Paid`.
   - Item-linked orders cannot change `itemId`/`qty`; cancel and re-create instead (prevents stock drift).
   - Purchasing lists Confirmed + Paid + Purchased orders, with a "Recap by item" view and CSV export for the end-of-trip recap.
7. **Navigation loading**: in-app navigation and Refresh use quiet reloads (`reload({ quiet: true })`) that show a top progress bar + skeleton; only the first load and auth changes use the full-screen connection gate.
8. **Storefront**: no workspace bar for customers; open trips are highlighted as cards and items are grouped by trip. Merchants previewing from the workspace get a small "Exit preview" button (`sessionStorage['jo-store-preview']`).

---

## 6. Design System & UI Specifications

- **Typography**: Compact Geist Sans (`400`, `500`, `600`) and Geist Mono for code/tokens/monetary figures.
- **Surfaces & Palettes**:
  - Light mode: Warm paper (`--bg: #faf8f5`, `--card: #ffffff`, `--border: #e6e2db`).
  - Dark mode: Charcoal (`--bg: #141413`, `--card: #1c1c1b`, `--border: #2b2a27`).
- **Accents**: 6 selectable accent presets (`indigo`, `emerald`, `violet`, `amber`, `rose`, `cyan`).
- **Density**: `comfortable` (standard padding) and `compact` (dense tabular operations).
- **Navigation**:
  - Desktop sidebar + mobile header and bottom drawer.
  - Keyboard shortcuts: `Ctrl+K` / `Cmd+K` (Command Palette), `N` (New item/order modal), `Esc` (Dismiss dialogs), `g` followed by key for chord navigation.
- **Empty States**: Clear, purposeful empty states without decorative illustrations or fake mock data.

---

## 7. Testing & Verification Guide

| Command | Purpose | Notes |
|---|---|---|
| `npm test` | Runs unit tests (`tests/*.test.js`) | Validates pricing formulas, margins, expense allocation, record diffing, CSV sanitization. |
| `npm run build` | Compiles Vite production bundle | Ensures zero bundle syntax or dependency import errors. |
| `npm run test:e2e` | Playwright responsive & workflow tests | Tests 5 viewport widths (1440, 1024, 820, 390, 360px), storefront flows, payment capture. |
| `npm run test:db` | Isolated PostgreSQL 16 schema checks | Spawns temporary Docker container `postgres:16-alpine`. Never run against hosted Supabase! |
| `npm run test:integration` | End-to-end connected flow with Docker DB | Validates workspace creation, live order lifecycle, and invoices against real PostgreSQL. |
| `npm run format` | Prettier code formatter | Formats code across `src`, `tests`, `scripts`, `docs`. |

> [!NOTE]
> On environments where `node` or `npm` are not in the active shell `$env:PATH`, ensure execution uses the installed Node binary or launch via configured tools.

---

## 8. Android Packaging & Mobile APK Build

The application uses **Capacitor** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) to wrap the Vite web application into a native Android package without altering the core React codebase.

- **Config File**: [`capacitor.config.json`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/capacitor.config.json) (`appId: "com.jastipops.app"`, `webDir: "dist"`).
- **Vite Compatibility**: `vite.config.js` sets `base: './'`, allowing assets to load properly in WebView environments. Hash routing (`#Overview`, `#Orders`) provides seamless in-app navigation without server URL rewrite requirements.
- **Automated Cloud Builder**: [`.github/workflows/build-apk.yml`](file:///c:/Users/Kenny%20Chen/Documents/jstipv4/.github/workflows/build-apk.yml) runs on Ubuntu in GitHub Actions (with JDK 17, Android SDK, Gradle), building `jastip-ops-debug.apk` and publishing it as a downloadable build artifact on every push or manual dispatch.
- **Local Scripts**:
  - `npm run cap:build`: Rebuilds Vite bundle and syncs into the Android project.
  - `npm run cap:open`: Opens the project inside Android Studio.

---

## 9. Instructions for AI Prompts
When working on any future prompt in this repository:
1. **Never introduce mock/fake records into connected mode**: Keep blank states blank.
2. **Never query raw business tables from frontend code**: Use `rpc()` through `src/lib/repository.js`.
3. **Preserve snapshot integrity**: Do not alter frozen order quote costs or append-only payment histories.
4. **Preserve Helper role boundaries**: Ensure Helper-visible data excludes restricted financial fields.
5. **Keep UI consistent**: Use shared components in `src/ui.jsx` and token classes in `src/styles/tokens.css`.
6. **Always update this MEMORY.md file** if new architectural components, schemas, or workflows are added.
7. **Strict Cloud-First Invariant (No Localhost)**: The user does NOT run this app locally. Never suggest running localhost or starting local servers. The user pushes directly to GitHub, which automatically deploys to Vercel and builds APKs via GitHub Actions. All instructions, auth callbacks, and verification must be framed for Vercel and hosted Supabase.
