# Supabase setup and hosted verification

The app is configured locally for project `pbzqorplpfmspnvfiijb`. The supplied publishable key is a browser key, not a migration credential. `.env.local` is ignored by Git. The environment draft also contains the project URL, publishable key, `VITE_ENABLE_DEMO=false`, and a request to allow this project host through the development environment's network policy.

## Apply the database migration

Open [the project SQL Editor](https://supabase.com/dashboard/project/pbzqorplpfmspnvfiijb/sql/new), create a new query, paste the complete contents of `supabase/migrations/202610100001_operations.sql`, and run it. The migration is transactional, additive, and starts without fixtures. It creates the private `jastip` schema, RPC functions in `public`, and two storage buckets. It does not delete or import existing data. Reapplying the same file recreates its functions and policies safely.

Alternatively, an authorized operator can use the Supabase CLI to link this project and apply the migration. Use the normal CLI login or a secure environment binding; never put an access token or database password in Git or chat. Do not run the SQL under `supabase/tests` on this project. That SQL uses fake authentication exclusively in isolated local test containers.

The publishable key intentionally has no permission to create tables, bypass RLS, assign platform administrators, or apply migrations. Applying the migration requires the project owner's SQL Editor or an authorized migration connection.

## Configure the app and Supabase Auth

Copy `.env.example` to `.env.local` and supply the project URL and its publishable key. Those values are already configured in the current workspace. Configure the same `VITE_` variables in your frontend deployment and rebuild; Vite reads these variables at build time. Keep demo mode disabled.

In Supabase Authentication → URL Configuration, set the deployed app's Site URL and allow its callback URL. For development also allow the dev server's URL. Signup verification and password reset use the app's origin and pathname; reset returns to `#Recovery`. Configure Supabase's email delivery for production and keep email verification enabled. Invitation acceptance checks the authenticated user's verified email against the invited address.

Run `npm ci` and `npm run dev`. Create an account, verify its email, and create a workspace with a unique slug. The workspace starts on Starter with empty orders, items, trips, customers, invoices and reports. Add a trip, set its status to Open for orders, add an item and configure the storefront's WhatsApp contact. Share `#Storefront/your-slug` with buyers.

## Assign the platform owner

After the intended platform owner creates and verifies an account, run this as the database owner, substituting that account's email:

```sql
insert into jastip.platform_admins(user_id)
select id from auth.users
where lower(email) = lower('YOUR_VERIFIED_EMAIL')
  and email_confirmed_at is not null
on conflict do nothing;
```

There is no public admin signup or role preview in the connected app. Reload after the grant. The workspace selector then exposes the platform console. Platform operators without a seller workspace can also open `#Merchants` directly after signing in.

## Manual subscriptions

New workspaces use Starter. In Merchants, an authorized platform owner can assign Pro or Business, set the lifecycle status, record a verified manual payment invoice, and record refund notes. Trial status creates a real 14-day expiry, and Extend trial adds seven days. Expired trials cannot accept writes or buyer orders. Payment retry is absent in the connected app because no payment gateway is configured. Refund notes document manual handling; they do not move money.

Owners can request a plan through Billing. The request appears in the workspace's notes and audit history; the platform owner reviews the merchant and activates the plan after arranging payment. Invoice rows are real database records, never example invoices. Plan limits are validated on the server, including active items, monthly orders, team members and Starter's two open trips.

## Hosted acceptance checks

The local PostgreSQL suite and local browser integration tests validate the migration, RPC authorization and core workflows. They do not establish that the hosted project has been migrated or that hosted Auth/email/Storage is configured. Once the migration and environment network change are applied, verify:

1. Signup, email verification, login, password reset and logout against this project.
2. Workspace creation starts empty; refreshing does not import legacy browser demo records.
3. Product photos upload to `jastip-products`; order payment and expense proofs upload to `jastip-proofs` and download through short-lived signed links.
4. A buyer can browse, reserve stock, place a custom request with a reference photo, and track using the private token. Other orders and customer information must never appear in the buyer response.
5. The seller can quote a request, confirm an order, record partial/full payments, capture actual purchase cost, ship, deliver and export reports. Another session's changes must cause a stale write rejection instead of silently replacing data.
6. Owners invite a verified email via a copied invitation link; that user accepts it and gets the persisted role. Owners can update Manager/Helper roles. Helpers cannot read pricing snapshots or change item pricing and workspace settings.
7. Platform plan/status/trial changes, verified invoices, report resolution and read-only support are persisted and audited. Platform operators cannot write through the tenant commit RPC without tenant membership.

## Data and services

Business records are stored in `jastip.records` with a tenant ID, constrained kind, stable ID, JSONB payload and timestamps. Authentication membership, workspaces, invitations, platform administrators, audit entries and rate limits have dedicated relational tables. RPCs validate each record type, lock workspace revisions and commit batches atomically. Financial quote/purchase snapshots and payment ledgers are protected from rewriting. Raw tables remain private behind RLS and denied schema/table privileges.

The app refreshes while the tab is visible every 30 seconds and on navigation. No business records are saved to browser localStorage in connected mode. Browser storage holds Supabase's session and personal appearance preferences. Legacy mockup data is ignored and never copied into this database. The opt-in demo uses its own storage key and a dynamically loaded fixture module.

The app copies WhatsApp messages and invitation links for the user to send. It does not send messages through a third-party messaging provider, process gateway payments, configure custom domains, or provide a public integration API. Those are separate services, not functioning mock buttons.
