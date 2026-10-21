# Jastip Ops — Code Review, 2026-10-21

Scope: whole repo at commit `e2ee73e` (frontend, migration SQL, CI/APK workflows, docs). Method: read all source, SQL and configs; ran `npm ci`, `npm install`, `npm test`, `npm run build` in a clean container. Docker-based suites (`test:db`, `test:integration`) and Playwright e2e were not run here; hosted Supabase/Vercel were not inspected.

## Overall
The security model is strong and deliberate: private schema with revoked privileges, every entry point a `SECURITY DEFINER` RPC with empty `search_path`, server-side recalculation of prices, atomic stock reservation, frozen snapshots, append-only payment ledger enforced in SQL, Helper field stripping on the server, path-scoped Storage policies, 256-bit tracking tokens, CSV formula-injection protection, and tests at unit/SQL/browser levels. Most issues below are about **shipping (CI/APK)** and **concurrency/UX edges**, not the core security design.

## Findings (most severe first)

### Critical — blocks shipping
1. **`package-lock.json` is out of sync with `package.json`.** The Capacitor packages were added to `package.json` but the lockfile was never regenerated. `npm ci` fails ("Missing: @capacitor/android@6.2.2 from lock file…"), so `ci.yml` fails on every push. `build-apk.yml` uses `npm install`, which hides the problem there. *Fix:* regenerate and commit the lockfile (a ready file can be produced), and switch the APK workflow to `npm ci`.
2. **The APK is built without Supabase configuration.** `build-apk.yml` runs `npm run build` with no `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, and `.env*` files are git-ignored, so the installed app shows the "Connect Supabase" screen. *Fix:* add both as GitHub Actions repository secrets/variables and pass them as `env:` on the build step (publishable key only).
3. **Links and auth redirects use `location.origin`, which is `https://localhost` inside the APK.** Affects signup verification (`emailRedirectTo`), password reset (`redirectTo`), copied invite links (`repository.js`), the merchant sign-up link (`workspaces.jsx`) and any shared storefront URL. Invitees and buyers would receive unusable links. *Fix:* add `VITE_PUBLIC_APP_URL` (the Vercel URL) and build every outbound link and redirect from it; add that URL to Supabase Auth's allowed redirects.

### High
4. **Workspace-wide optimistic lock collides with buyer traffic.** `jastip_place_order`, admin actions and role changes all bump `workspaces.revision`, so a seller saving any form while a buyer orders gets "Another user changed this workspace", the store reloads, and the seller's input is lost. This gets worse exactly when the shop is busy. *Fix options:* per-record revision (`updated_at` / version in `records`) checked only for the records in the batch; or auto-retry when the conflicting changes don't touch the same records.
5. **Stock reservation can drift.** For item-linked orders still in Requested/Quoted, `jastip_commit` allows changing `qty` or `itemId` without adjusting stock, and cancellation restocks `old.qty` of `old.itemId` — so the wrong quantity or wrong item gets restocked. *Fix:* treat `itemId` and `qty` as frozen for item-linked orders from creation, or re-reserve the difference inside `jastip_commit`.

### Medium
6. **Docs contradict the cloud-first rule.** `README.md` and `docs/supabase-setup.md` tell the user to run `npm ci`/`npm run dev` and copy `.env.local`; the unconfigured screen in `auth.jsx` says "Add … to .env.local, then restart the app". Should point to Vercel/GitHub env vars and redeploy.
7. **`MEMORY.md` RPC list is out of date.** It names `jastip_accept_invitation(p_invite)` (actual: `p_invitation`), omits `jastip_create_workspace`, `jastip_platform`, `jastip_report_store`, `jastip_resolve_report`, `jastip_set_member_role` and the storage helper functions, and omits `purchaseFxRate`/`allocation` from the Helper-stripped order fields. Future AI sessions relying on it will be misled.
8. **"Base currency" in the Welcome walkthrough does nothing.** It's an uncontrolled `<select>` that is never saved; the app is IDR-only (`money()` hardcodes "Rp", no server field). Conflicts with the "honest" design rule. Remove it or implement a real base currency.
9. **Walkthrough leaves the first trip in "Planning".** The storefront only lists items on trips that are "Open for orders", so "Explore your storefront" at the end of onboarding shows an empty shop. Add an "Open for orders" step or explanation (affects the PRD activation goal).
10. **No way to remove a member or revoke an invitation.** Re-inviting an email that already has an invitation hits a raw unique-constraint error. Also, anyone who accepted an invite can never create their own workspace (`jastip_create_workspace` rejects any membership) — confirm this is intended.
11. **Storefront-level rate limits can be used for denial of service.** The shared bucket `store:<id>` allows 100 orders per 10 minutes for all buyers combined, and reports are 10 per 10 minutes per store; one script can lock out real buyers. Consider per-IP/phone limits plus a higher store ceiling or a CAPTCHA.
12. **Background refresh error toasts repeat every 30 s** while offline or when a session expires (`refreshQuietly` announces each failure).

### Low
13. `upload()` names every file `.jpg` regardless of PNG/WebP content type.
14. Workspace audit shows the actor as a raw user UUID rather than a name.
15. `manualChunks: { supabase: [...] }` produces an empty 0 kB chunk; Supabase is bundled into the main chunk (385 kB / 112 kB gz). Harmless but the config does nothing.
16. Demo fixtures are emitted into production `dist/` as a lazy chunk (not loaded unless demo mode, but publicly fetchable). Fine as long as fixtures stay fictional.
17. Default FX rates in `money.js` are static (e.g. JPY 105, USD 15,700); they're editable per trip, but the UI should make clear they are defaults.
18. `build-apk.yml` runs `npx cap add android || true` on every build (Android project not committed) and produces an unsigned debug APK only — fine for testing, not for Play Store.
19. Scope note: the PRD lists native apps as a v1 non-goal; the Capacitor APK is an addition. Keep it a thin wrapper and record the decision.

## Suggested order of work
1 → 2 → 3 (unblock CI and make the APK actually work) · then 6 & 7 (docs/memory accuracy) · then 4 & 5 (data integrity under load) · then 8–12.
