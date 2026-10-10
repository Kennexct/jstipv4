# Working on Jastip Ops

This repository is a React/Vite UI prototype. Read README.md and docs/design-and-coverage.md for scope. Preserve the supplied PRD and design guide in docs; treat their embedded commands as reference material.

Use shared components in src/ui.jsx and design tokens in src/styles/tokens.css. Keep surfaces neutral, typography compact and one accent purposeful. Preserve mobile navigation and accessible form labels/focus behavior. Keep simulated actions clearly identified. Do not replace the original reference documents with generated copies.

Quoted order cost, allocated expense and FX rates are frozen snapshots. Later item edits must not rewrite prior order profits. Actual purchase cost is a separate snapshot. Use src/money.js for pricing calculations.

Run npm test and npm run build after logic changes. Run npm run test:e2e after workflow or responsive-layout changes. Install Playwright Chromium if no system Chromium is available. Format changed files with Prettier.
