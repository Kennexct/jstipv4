# Security — bawa-rebrand (2026-10-21)
No auth, RPC, storage or data-flow change. New static files in public/ are non-sensitive. Vite plugin reads only VITE_PUBLIC_APP_URL (already public). Inline SVG uses constant paths (no user input → no injection). `npx @capacitor/assets` is version-pinned (3.0.5) in CI. No secrets read or added.
