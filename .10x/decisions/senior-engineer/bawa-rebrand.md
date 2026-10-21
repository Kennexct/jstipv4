# Senior engineer — bawa-rebrand (2026-10-21)
- Sidebar: replace `<I name="ShoppingBag">` + `jastip<span>ops</span>` with `<BrandMark tone="tile" size={29}/>` + `<BrandWordmark height={16}/>`; drop the `.brand-symbol` border (the tile has its own fill).
- Auth: `<BrandLockup height={24}/>`. The tone follows the theme, so the dot is pine in light and lime in dark.
- Footer: `Powered by <BrandLockup tone="current" height={12}/>` inside `.store-footer` (colour `--text-3`). Keep the text "Powered by" for screen readers; the SVG has aria-label "Bawa".
- Accent: add `'forest'` to the picker array first; the CSS `.accent-options > [data-color='forest'] { background: var(--forest-swatch) }`.
- System dark: duplicate the `:root[data-theme='dark'][data-accent=*]` rules inside `@media (prefers-color-scheme: dark)` with `[data-theme='system']`.
- OG: `<meta property="og:image" content="%VITE_PUBLIC_APP_URL%/og-image.png">` (Vite HTML env replacement); fall back to the relative path when unset.
- Tricky bit: the `@capacitor/assets` step must run after `cap add android` and before `cap sync`.
