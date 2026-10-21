# SDE — bawa-rebrand (2026-10-21)
## Built
- `public/`: favicon.svg/16/32, apple-touch-icon, icon-192/512, maskable-512, og-image.png, manifest.webmanifest (name Bawa, theme #12352B).
- `index.html`: title "Bawa · Your jastip business, in order", icons, manifest, light/dark theme-color, og/twitter meta.
- `vite.config.js`: `absolute-og-image` plugin rewrites og:image to `${VITE_PUBLIC_APP_URL}/og-image.png` when set (relative otherwise).
- `src/brand.jsx`: `BrandMark` (auto/current/tile), `BrandWordmark`, `BrandLockup`, inline SVG from docs/brand geometry; re-exported from `src/ui.jsx`.
- Sidebar brand row (tile + wordmark), auth card lockup, `Loader brand` on the first-load gate, "Welcome to Bawa", storefront footer "Powered by" + mono lockup (`.store-powered`).
- Tokens: `--brand-*`, `--brand-ink/--brand-dot` (theme-aware), `--forest-swatch`; base accent = forest (#1F6B4F light / #C6F26B dark); explicit indigo rule; all 9 accents now have system-dark values.
- `accentOptions` in `src/data.js` (forest first), picker uses it; defaults `forest` in `records.js` + demo fixtures. Tinted mode no longer recolours the brand tile.
- APK: appName Bawa; `assets/` Capacitor sources; workflow runs `@capacitor/assets@3.0.5 generate --android` between `cap add` and `cap sync`; artifact `bawa-debug.apk`.
- Names: package.json/lock `bawa`, CI "Validate Bawa", README/AGENTS headings + brand rules, MEMORY.md.
## Deviations
- Spec listed `src/assets/brand/*.svg`; not needed because components are inline. Source SVGs stay in `docs/brand/`.
## Tech debt
- Storefront loading spinner keeps the neutral bag icon (merchant context) — intentional.
- Users who changed any appearance setting before have `indigo` saved and keep it.
