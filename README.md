# Jastip Ops

An interactive, responsive UI mockup based on **Jastip Ops PRD v1.0** and the attached **Claude Design Taste** guide. Seller operations, an account-free buyer storefront, onboarding, billing, and platform administration are connected through browser-local demo data.

## Open the project

1. On [GitHub](https://github.com/Kennexct/jstipv4), choose **Code → Download ZIP** and extract it, or clone the repository.
2. Install [Node.js](https://nodejs.org/) 22 or newer.
3. Open a terminal in the extracted project folder, next to `package.json`.
4. Run:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, usually `http://localhost:3000`. Keep the terminal running. This is a React application: opening `src/main.jsx` or double-clicking `index.html` does not launch it. Use VS Code to browse and edit the source.

For a production build, run `npm run build`, then `npm run preview`. Deploy the resulting `dist` folder to a static host. Hash routes and relative asset paths support subdirectory hosting.

## Explore

- Seller: Overview, Orders, Requests, Items, Trips, Purchasing, Customers, Reports, Settings, Billing.
- Buyer: click **View storefront** to browse, place an order or custom request, and track an order code.
- Platform: click the workspace name in the sidebar and choose platform admin; Metrics, Merchants, Moderation, Audit.
- Onboarding: workspace selector → Welcome.
- `Ctrl/Cmd K` opens search, `N` captures an item, `Esc` closes the top dialog. Use Settings for theme, accent, density, motion, screen state previews and demo roles.

Try a buyer order, open it in Orders, record a partial payment, and pay the balance. Paid orders appear in Purchasing; record the actual cost there, then progress to Shipped and Delivered. Order margins use frozen quote and purchase snapshots. Reports and order/customer directories export CSV.

All changes persist in localStorage in this browser. Settings → Workspace → Reset demo restores the fixtures. The role and support previews demonstrate UI behavior; they are not security boundaries. No real payment, invitation, refund, message, or authentication is performed. Graph trends and historical invoices are illustrative. Product artwork is local placeholder artwork, not official product photography.

## Files

- `src/`: React screens, shared components, pricing logic, fixtures and design tokens.
- `docs/Jastip-Ops-Mockup.pdf`: screen review booklet.
- `docs/screenshots/`: desktop, mobile and interaction captures.
- `docs/design-and-coverage.md`: implementation coverage and prototype boundaries.
- `docs/design-taste.md` and `docs/references/`: original supplied design guide and PRD.

## Validate and export

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Browser tests cover every screen at five widths, buyer ordering and partial payment persistence, actual purchasing and delivery tracking, pricing capture, appearance preferences, and admin support safeguards. Tests automatically use system Chromium if available; otherwise Playwright's installed Chromium. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed.

With the dev server running, `node scripts/export-mockup.mjs` refreshes screenshots and the PDF booklet. Set `MOCKUP_URL` to capture a different running instance.
