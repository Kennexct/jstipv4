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

## 2026-10-21 bawa-rebrand (ADR-005, Accepted — built)
- Name chosen: **Bawa**. Brand kit v1.0 in `docs/brand/` + canvas "Bawa — Brand kit" (boards A, E–H).
- Approved by Kenny 14:34 (all 5 proposals). Phases 4–6 done locally: unit, build, e2e 15/15, db, integration 3/3 PASS. No migration.
- Pending hosted checks: Vercel favicon/OG, APK Actions run (workflow fixed 15:10: ubuntu-24.04 + preinstalled SDK) + device install. Validate Bawa CI green on hosted GitHub (run 39566245948).
- Gate before public announcement: PDKI trademark + domain check.

## 2026-10-21 apk-supabase-config (small fix)
- APK build now gets Supabase settings from GitHub Actions secrets (fails loudly if missing); auth email links use the public app URL. Needs Kenny: add 3 repo secrets, replace build-apk.yml, push.

## 2026-10-21 apk-photo-picker (ADR-006)
- APK photos use the native Take photo / Choose from gallery sheet (@capacitor/camera); web drops camera-only `capture`; files without a type accepted. Local: unit, build, e2e 16/16 PASS. Needs device QA after the next APK build.

## 2026-10-23 landing-and-support-chat (ADR-007, Accepted)
- Spec `.10x/specs/2026-10-23-landing-and-support-chat-design.md` approved by Kenny 13:39. Phases 1–3 written (cto, pm, architect, staff, em, senior). Implementation in progress.
- 2026-10-23 phases 4–6 done locally on branch `feature/landing-and-support-chat`: unit 13/13, build, db PASS (2 files), e2e 19/19, integration 4/4. Landing at `/` (signed out) and `#Home`; chat bottom-right; admin Inbox.
- Needs Kenny: apply migration 202610220001 in Supabase → push/merge → CI green → smoke test on Vercel (reviews/2026-10-23-landing-qa-report.md).

## 2026-10-23 sprint-1-daily-ops (ADR-008, Accepted)
- Plan of record: the doc "Bawa from a jastiper's seat" → Delivery plan (4 sprints, 26 Oct – 18 Dec). Kenny's answers: no `wa.me` (Open in WhatsApp dropped), refunds on the same ledger, interviews confirmed.
- Branch `feature/sprint-1-daily-ops`, stacked on `feature/landing-and-support-chat`. Phases 1–3 written.
- 2026-10-23 sprint 1 built (phases 4–6) on `feature/sprint-1-daily-ops`: unit 19/19, db 3/3, e2e 23/23, integration 4/4. Tracker items set to In review. Needs Kenny: apply migrations 202610220001 + 202610230001, then the patches, then smoke test (reviews/2026-10-23-sprint-1-qa-report.md). Next: sprint 2 (9–20 Nov) — out of stock/substitute, buyer refunds on the same ledger, ongkir, needs-me-today, deadline on cards.
