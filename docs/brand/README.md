# Bawa brand kit v1.0

**Product name:** Bawa (previously "Jastip Ops"). Chosen 21 Oct 2026.
**Meaning:** Indonesian for "bring". The whole job in one verb: go, find, bring it home.
**Tagline:** Found there. Brought home. / *Ditemukan di sana. Dibawa pulang.*
**Page title:** Bawa · Your jastip business, in order

> **Before the public switch:** search "bawa" on PDKI (DJKI) in classes 9, 35 and 42, and secure the domain and social handles. The in-app rename can be built now and shipped once that check is clear.

The visual reference is the design canvas "Bawa — Brand kit", boards A and E–H.

---

## 1. Folder map

| Path | What | Where it goes in the repo |
|---|---|---|
| `logo/bawa-lockup-*.svg` | Mark + wordmark, outlined | `src/assets/brand/` (imported) |
| `logo/bawa-mark-*.svg` | Mark only | `src/assets/brand/` |
| `logo/bawa-wordmark-*.svg` | Wordmark only | `src/assets/brand/` |
| `logo/*-currentcolor.svg` | Inherit `color` from CSS | storefront footer, mono uses |
| `icon/favicon.svg`, `png/favicon-32.png`, `png/favicon-16.png` | Browser tab | `public/` |
| `png/apple-touch-icon-180.png` | iOS home screen | `public/` |
| `png/icon-192.png`, `png/icon-512.png`, `png/maskable-512.png` | Web app manifest | `public/` |
| `social/og-image-1200x630.png` | Link previews (WhatsApp, etc.) | `public/` |
| `capacitor-assets/*` | APK icon + splash source | `assets/` (for `@capacitor/assets`) |
| `tokens/bawa-brand.css` | CSS custom properties | append to `src/styles/tokens.css` |
| `tokens/bawa-brand.json` | Same values, machine-readable | reference |

The wordmark is converted to vector shapes from Space Grotesk Bold (SIL Open Font License), so **the app does not need to load Space Grotesk**. Never retype "bawa" in a font.

## 2. Logo rules

- **Primary:** horizontal lockup. Use `on-light` on light surfaces (pine dot) and `on-dark` on forest, night or dark mode (lime dot).
- **Clear space:** x on every side, where x is the diameter of the destination dot (0.19 × mark height).
- **Minimum size:** lockup 20px tall, mark 16px. Below that, use the app icon / favicon.
- **The lime dot only sits on forest, night or a dark surface.** On white it drops to 1.3:1.
- Don't stretch, rotate, recolour with a merchant accent, add effects, or rebuild the lockup from parts.
- The storefront belongs to the merchant. Bawa only appears as a small mono "Powered by bawa" in the footer.

## 3. Colour

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--brand-forest` | `#12352B` | Brand surface: icon, splash, email header, auth accents | 13.4 on white |
| `--brand-pine` | `#1F6B4F` | Brand green on light UI; light value of the `forest` accent | 6.4 with white text |
| `--brand-lime` | `#C6F26B` | Destination dot, highlights; dark value of the `forest` accent | 10.4 on forest, 13.1 on `#1D1D1C` |
| `--brand-fog` | `#E8ECE6` | Light brand surface | — |
| `--brand-paper` | `#F1F4EC` | Mark and text on forest | 12.0 on forest |
| `--brand-forest-deep` | `#0E2A22` | Panels on forest | — |
| `--brand-mist` | `#9FB7A9` | Secondary text on forest | 7.2 on forest-deep |
| `--brand-night` | `#0B0C0B` | Darkest surface, dark splash | — |

Proportion on brand surfaces: mostly forest, then fog/paper, lime as a small accent (≈5%).

### Dashboard accent
- Add a 9th accent, **`forest`**: light `#1F6B4F`, dark `#C6F26B`. Primary buttons already use `color: var(--surface)`, so lime buttons get dark text automatically.
- `forest` becomes the **default for new accounts** (`src/lib/records.js`, `src/demo/fixtures.js`). Existing accounts keep their saved accent.
- Merchant accents (`storeAccents`, validated in `jastip_commit`) are untouched. No migration.
- Existing gap to fix with this: dark accent values only apply under `data-theme='dark'`, not `data-theme='system'` when the OS is in dark mode. Add the same rule inside the `prefers-color-scheme: dark` block for all 9 accents.

## 4. Type

| Role | Family | Notes |
|---|---|---|
| Wordmark | Space Grotesk 700, −0.035em | Outlined SVG only |
| Display (optional) | Space Grotesk 600/700 | Splash, marketing and onboarding headlines. Token `--font-display`. Not in app UI. |
| UI | Geist 400/500/600 | Unchanged |
| Numbers | Geist Mono | Unchanged |

## 5. Voice

- Write "Bawa" in sentences and "bawa" only in the logo. Never "BAWA", "Bawa Ops" or "Bawa App".
- Plain verbs (bring, buy, pay, ship), honest numbers ("Margin after trip costs"), sentence case, short.
- No hype ("revolutionary", "AI-powered"). Don't talk over the merchant on their storefront.

## 6. Rename map

| Where | Today | Bawa |
|---|---|---|
| `index.html` `<title>`, description | Jastip Ops · Your business, in order | Bawa · Your jastip business, in order |
| `index.html` head | no icons | favicon.svg + png, apple-touch-icon, manifest, `og:*` / `twitter:*`, `theme-color` |
| `public/manifest.webmanifest` | — | name "Bawa", theme `#12352B`, background `#12352B`, icons 192/512/maskable |
| `src/main.jsx` sidebar `.brand` | bag icon + "jastip ops" | 29px app icon + wordmark (forest in light, paper in dark) |
| `src/auth.jsx` `.auth-brand` | bag icon + "jastip ops" | on-light lockup, 24px tall (on-dark in dark theme) |
| `src/workspaces.jsx:831` | Welcome to Jastip Ops | Welcome to Bawa (update `tests/database.integration.js:59`) |
| `src/workspaces.jsx:1194` storefront footer | Powered by jastip ops | Powered by [mark + wordmark, currentColor, `--text-3`] |
| `capacitor.config.json` `appName` | Jastip Ops | Bawa |
| APK icon + splash | Capacitor default | `npx @capacitor/assets generate --android` in the APK workflow |
| `.github/workflows/*.yml` names, APK file name | jastip-ops | bawa |
| `package.json` `name` | jastip-ops | bawa |
| `README.md`, `AGENTS.md`, `MEMORY.md` titles | Jastip Ops | Bawa (add "formerly Jastip Ops") |
| Supabase Auth email templates | default | forest header + on-dark lockup PNG, Bawa wording (dashboard, Kenny) |

**Stays on purpose:**
- `jastip` schema and `jastip_*` RPC names are internal, and renaming them touches every migration, grant and test.
- `appId` `com.jastipops.app`: changing it installs a second app. Decide once, before any Play Store release.
- `jastip-ops-demo-v1` localStorage key keeps saved demo data.
- Merchant storefront accents.
