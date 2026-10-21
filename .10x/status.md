# Status — Jastip Ops

**Phase:** flexible-orders implemented and verified locally (2026-10-21). Awaiting: Kenny applies migration 202610210001 in Supabase, then pushes.
**ADRs:** 001-flexible-orders.

## Done
- Discovery + Claude project docs (2026-10-21 AM).
- Flexible orders, storefront trip highlights, navigation loader, sidebar layout (see decisions/sde/flexible-orders.md).
- Lockfile regenerated → `npm ci` works again.
- Local verification: unit 10/10, build OK, SQL suite PASS, e2e 8/8, integration PASS.

## Not verified
Hosted Supabase (migration not yet applied), Vercel deploy, APK runtime.

## Next
Review items still open: APK env secrets, public app URL for links in APK, per-record locking, docs drift (README/setup).
