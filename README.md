# Bawa (formerly Jastip Ops)

> Product name: **Bawa** (renamed 2026-10-21, ADR-005). Internal identifiers — the `jastip` database schema, `jastip_*` RPCs and the Android appId `com.jastipops.app` — keep the old name on purpose. Brand kit and logo rules: `docs/brand/README.md`.

A React/Vite operations app for sellers, account-free buyers and platform administrators, using Supabase Auth, PostgreSQL RPCs and Storage. It follows the supplied Jastip Ops PRD and Claude Design Taste guide. Connected mode starts with empty business data; demo mode is explicitly opt-in.

## Run

Install Node.js 22 or newer, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows, copy `.env.example` in your editor or file manager. Fill in the Supabase project URL and publishable key, apply the supplied migration, and open the address printed by Vite. The current cloud workspace already has the provided project configuration in its ignored `.env.local`.

See [Supabase setup](docs/supabase-setup.md) for the project SQL Editor link, exact migration, Auth callbacks, platform owner provisioning, manual subscriptions and hosted acceptance checks. A publishable key cannot apply database migrations.

For deployment, set the same `VITE_` values in the host, run `npm run build`, and deploy `dist`. Never place a service-role key in a frontend variable. `npm run preview` serves a built copy locally. Hash routes work on static hosts and under subdirectories.

## Workflows

- Seller: item capture with photos and live pricing; trips and planned/actual expenses; customer directory; order/request quoting; partial/full payments; actual purchasing; delivery; filters, reports and CSV exports.
- Buyer: share `#Storefront/your-slug`; browse available published items, place orders/custom requests with consent, and track using a private token.
- Team: owners invite verified emails through shareable links and assign persisted Manager/Helper roles. Helpers have restricted data and operations, enforced on the server.
- Platform: authorized operators manage merchant lifecycles, plans, real trial dates, manual invoices, refund notes, moderation and read-only support. New workspaces use Starter; plan activation and subscription payments are manual.
- Appearance: light/dark/system, six accents, density, reduced motion and mobile navigation. `Ctrl/Cmd K`, `N`, `Esc` and `g` navigation chords are available.

Business records are saved only after database confirmation. Stale revisions are rejected. Quotes and purchase costs remain snapshots; payment history is append-only. Product pictures are public, while payment/expense proofs require authorized, short-lived download links. The frontend refreshes every 30 seconds while visible and when navigating.

WhatsApp messages and invitation links are copied for users to send themselves. There is no payment gateway, automatic third-party messaging, custom-domain provisioning or public integration API. Signup verification and reset email delivery depend on hosted Supabase Auth configuration.

## Validate

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run test:db
npm run test:integration
npm run build
```

The last two test suites require Docker. `test:db` runs security and workflow assertions in isolated PostgreSQL 16. `test:integration` runs the connected React app against that database through a test-only RPC transport with simplified test authentication. The test transport is never deployed. Browser tests use system Chromium when available, otherwise Playwright Chromium. CI runs these checks on pushes and pull requests.

Passing local tests does not establish that the hosted Supabase migration, email delivery or hosted Storage permissions have been verified. Consult the hosted acceptance checklist before calling the live deployment ready.

## Preview and files

For an isolated visual preview, set `VITE_ENABLE_DEMO=true` and restart the dev server. This dynamically loads fixtures from `src/demo/fixtures.js` and uses a separate browser storage key. Do not enable it in production. With that preview running, `node scripts/export-mockup.mjs` generates the mockup screenshots and PDF.

- `src/lib/`: Supabase client, record diffing, RPC repository and uploads.
- `supabase/migrations/`: additive, transactional database setup; no fixtures.
- `supabase/tests/` and `scripts/test-*`: isolated local database checks.
- `src/`: seller/buyer/admin screens, authentication, shared UI and design tokens.
- `docs/supabase-setup.md`: setup and live acceptance instructions.
- `docs/design-and-coverage.md`: current feature coverage and boundaries.
- `docs/design-taste.md` and `docs/references/`: original supplied references.
- `docs/Jastip-Ops-Mockup.pdf` and `docs/screenshots/`: archived visual mockup captures with sample data, not the connected database.
