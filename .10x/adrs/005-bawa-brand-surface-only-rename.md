# ADR-005: Rebrand to Bawa as a surface-only rename

**Status:** Accepted (Kenny, 2026-10-21 14:34) · **Date:** 2026-10-21 · **Feature:** bawa-rebrand · **Author:** 10x-Team (Architect + Staff Engineer)

## Context
Kenny chose "Bawa" from four name directions. The developer team needs a kit it can apply. The product has user-visible names (title, sidebar, auth, walkthrough, storefront footer, APK) and internal names (`jastip` schema, `jastip_*` RPCs, `com.jastipops.app`, localStorage keys). Merchants already pick their own storefront and dashboard accent (ADR-004).

## Decision
- Rename **user-visible surfaces only**. Internal identifiers stay.
- The brand lives in `docs/brand/` (source of truth) and is shipped as static files in `public/` plus inline SVG components in `src/ui.jsx`. The wordmark is outlined SVG, so no new runtime font is needed.
- Brand colours are added as `--brand-*` tokens. A new `forest` dashboard accent (pine light / lime dark) becomes the default for new accounts. Merchant storefront accents stay out of the platform brand.
- APK icon and splash are generated in CI with `@capacitor/assets` from committed sources, because `android/` is not committed.

## Alternatives Considered
| Alternative | Pros | Cons | Why not |
|---|---|---|---|
| Full rename incl. schema/RPCs/appId | One name everywhere | Touches every migration, grant, test; appId change installs a second app; risk to hosted data | Cost and risk with no user value |
| Brand colours replace the accent system | Strong brand presence | Breaks the merchant's chosen accent (ADR-004 decision) | Merchants own their look |
| Load Space Grotesk as a web font for the wordmark | Easy to edit | +1 font request, layout shift, the font could be retyped wrongly | Outlined SVG is smaller and exact |
| Commit `android/` with icons | No CI step | Large generated tree, drifts from Capacitor upgrades | Generation in CI is repeatable |

## Consequences
**Positive:** no migration, so no hosted-DB risk. The rename can be reverted by reverting one commit. The brand assets are versioned in the repo.
**Negative:** internal names keep saying "jastip", so docs must say "Bawa (formerly Jastip Ops)". Adds one CI step and one devDependency-free `npx` call.
**Risks:** the trademark/domain may not be clear. Mitigation: merge behind the PDKI check and keep the public announcement separate. An OG image with a relative URL may not render in WhatsApp. Mitigation: use an absolute URL from `VITE_PUBLIC_APP_URL`.

## Dependencies
Depends on ADR-004 (accent preferences and storefront theme). Constrains a future appId change and a future marketing site, which should reuse `docs/brand/`.
