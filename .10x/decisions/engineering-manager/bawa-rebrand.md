# EM — bawa-rebrand (2026-10-21) · est. ~1 day
1. Copy `docs/brand/` into the repo; place `public/` files + `manifest.webmanifest`; update `index.html` head. (1h)
2. `BrandMark`/`BrandLockup` in `src/ui.jsx`; sidebar, auth card, storefront footer, welcome title + CSS. (2h)
3. Tokens: append brand tokens, `forest` accent in the picker + CSS, system-dark accent fix, default `forest`. (1.5h)
4. APK: appName, `assets/` sources, `@capacitor/assets` CI step, APK file name; CI/workflow/package/README names. (1h)
5. Tests: update the integration heading; e2e brand smoke (title, sidebar img, footer, forest default, dark/system). (1.5h)
6. QA pass at 3 widths × light/dark × 9 accents; WhatsApp OG check after the Vercel deploy. (1h)
Dependencies: 1 → 2; 3 is independent; 4 is independent; 5 after 2+3.
