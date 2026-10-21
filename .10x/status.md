# Status — Jastip Ops

**Phase:** flexible-orders implemented and verified locally (2026-10-21). Awaiting: Kenny applies migration 202610210001 in Supabase, then pushes.
**ADRs:** 001-flexible-orders.

## Done
- Discovery + Claude project docs (2026-10-21 AM).
- Flexible orders, storefront trip highlights, navigation loader, sidebar layout (see decisions/sde/flexible-orders.md).
- Lockfile regenerated → `npm ci` works again.
- Local verification: unit 10/10, build OK, SQL suite PASS, e2e 8/8, integration PASS.

## 2026-10-21 trip-status-view
- Trip status badges + status filters on Trips (UI only). e2e 9/9.

## 2026-10-21 team-invites-and-save-pattern (ADR-002)
- Email invites + status, unified save bar + unsaved-changes guard, top loading bar, walkthrough hidden when done. All suites pass locally.
- Needs Supabase dashboard: custom SMTP, redirect URL `https://<domain>/**`, optional email template wording.

## 2026-10-21 trip-currency-storefront-team (ADR-003, ADR-004)
- Currency per trip, 3 storefront layouts + colours, member remove/edit invite, tinted dashboard + synced appearance. All suites pass locally.
- Needs Supabase: run migration 202610210002 before deploying.

## Not verified
Hosted Supabase (migration not yet applied), Vercel deploy, APK runtime.

## Next
Review items still open: APK env secrets, public app URL for links in APK, per-record locking, docs drift (README/setup).
