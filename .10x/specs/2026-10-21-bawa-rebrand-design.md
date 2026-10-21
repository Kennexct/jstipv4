# Spec — Bawa rebrand (brand kit v1.0 → product)

**Date:** 2026-10-21 · **Feature slug:** `bawa-rebrand` · **ADR:** 005 · **Status:** approved by Kenny 2026-10-21 14:34 — all 5 proposals accepted

## Goal
Rename the product from "Jastip Ops" to **Bawa** and apply the brand kit (`docs/brand/`) to the platform's own surfaces, without touching merchant branding, data, RPCs or the money flow.

## Decided (21 Oct)
- Name: Bawa. Tagline "Found there. Brought home." / "Ditemukan di sana. Dibawa pulang."
- Brand owns platform surfaces only: tab/icons, sidebar brand row, sign-in card, welcome walkthrough title, storefront "Powered by" footer, APK name/icon/splash, auth emails, docs/CI names.
- Merchant storefront layout and accent unchanged.
- App UI type stays Geist. The wordmark ships as outlined SVG, so no new web font is loaded.

## Proposed (needs a yes)
1. **New dashboard accent `forest`** (light `#1F6B4F`, dark `#C6F26B`) as the 9th option and the **default for new accounts**. Existing users keep their saved accent.
2. **Fix dark accents under `data-theme='system'`.** Today the dark accent values only apply to the explicit dark theme.
3. **Keep `appId` `com.jastipops.app`** for now and decide before any Play Store release.
4. **Keep internal names** (`jastip` schema, `jastip_*` RPCs, demo localStorage key).
5. **Gate on a trademark/domain check.** The rebrand can be merged now, but the public announcement waits until the PDKI search is clear.

## Scope of change (no DB migration)
| Area | Files |
|---|---|
| Static assets | `public/` favicon.svg, favicon-16/32.png, apple-touch-icon.png, icon-192/512, maskable-512, og-image.png, manifest.webmanifest |
| Head | `index.html` title, description, icons, manifest, theme-color `#12352B`, og/twitter meta |
| Brand components | `src/assets/brand/*.svg`; new `BrandMark`/`BrandLockup` in `src/ui.jsx` (inline SVG, `currentColor`-aware, aria-label "Bawa") |
| Sidebar / auth / storefront | `src/main.jsx` `.brand`; `src/auth.jsx` `.auth-brand`; `src/workspaces.jsx` welcome title + footer; CSS in `src/styles/app.css` |
| Tokens | append `docs/brand/tokens/bawa-brand.css` to `src/styles/tokens.css`; add `forest` to the accent picker list + `.accent-options [data-color='forest']`; system-dark accent rules |
| Defaults | `src/lib/records.js` and `src/demo/fixtures.js` accent `'forest'` |
| APK | `capacitor.config.json` appName "Bawa"; `assets/` from `docs/brand/capacitor-assets`; workflow step `npx --yes @capacitor/assets@3 generate --android --iconBackgroundColor '#12352B' --splashBackgroundColor '#12352B'` after `cap add`; APK file `bawa-debug.apk` |
| Names | `package.json` name, CI workflow names, README/AGENTS/MEMORY titles ("Bawa, formerly Jastip Ops") |
| Tests | `tests/database.integration.js:59` heading; e2e: sidebar has `img[name=Bawa]`, title starts with "Bawa", footer says "Powered by"; unit: accent default |

## Out of scope
Renaming the DB schema or RPCs, changing the appId, a marketing site, new storefront accents, or Supabase email template edits (Kenny does these in the dashboard using the kit's PNG lockup).

## Error handling and edge cases
- Users with `accent: 'indigo'` saved keep it. Users with no saved preference get `forest`.
- An unknown accent value falls back to `forest`.
- Dark mode, all 9 accents, compact density, and desktop/tablet/mobile widths are covered by the e2e smoke.
- The OG image is absolute-URL dependent. Use `%VITE_PUBLIC_APP_URL%`, or a relative path plus Vercel's domain; verify with a WhatsApp link preview after deploy.

## Testing (in CI)
`npm test`, `npm run build`, `npm run test:e2e`, `npm run test:integration`. No `test:db` changes (no SQL).
