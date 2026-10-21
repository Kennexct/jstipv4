# Architect — bawa-rebrand (2026-10-21)
- Source of truth: `docs/brand/` (SVG, PNG, tokens CSS/JSON, BRAND.md). Generated outputs → `public/` and CI-generated Android resources.
- Components: `BrandMark({ tone: 'auto'|'tile'|'current', size })`, `BrandWordmark({ height })` and `BrandLockup({ tone, height })` in `src/ui.jsx`, inline SVG (no network request; themable; `role="img" aria-label="Bawa"`). Theme picks tone from `data-theme` via CSS (`.brand-tone-auto` uses `--brand-wordmark` var).
- Tokens: `--brand-*` + `forest` accent appended to `tokens.css`; system-dark accent rules added for all accents.
- No server/RPC/migration change. Failure modes: missing asset → broken icon only (no runtime error); bad OG URL → plain link preview.
