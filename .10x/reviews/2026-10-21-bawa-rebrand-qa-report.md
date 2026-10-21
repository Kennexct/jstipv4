# QA report — bawa-rebrand (2026-10-21)
| Suite | Result |
|---|---|
| npm test | PASS |
| npm run build | PASS (og:image relative; absolute with VITE_PUBLIC_APP_URL — checked) |
| npm run test:e2e | 15/15 |
| npm run test:db | PASS |
| npm run test:integration | 3/3 |
| @capacitor/assets dry run | 74 resources, app_name Bawa |
Edge cases: system theme in dark OS now uses dark accents (regression test added); lime only shown on dark surfaces; storefront keeps merchant accent.
Hosted checks pending (Vercel, WhatsApp preview, APK on device).
