# Staff engineer — bawa-rebrand (2026-10-21)
- Follow the design system: use the shared components in `src/ui.jsx` and `var(--accent)`; brand colours only via `--brand-*` tokens, never hard-coded hex in JSX.
- Never retype the wordmark in a font; use the SVG components.
- Lime (`--brand-lime`) only on forest/night/dark surfaces.
- Keep `jastip` internal identifiers; user-facing strings say Bawa. A grep check in review: `rg -i "jastip ops"` must only match docs history.
- Prettier style; one commit for assets, one for code, one for CI.
