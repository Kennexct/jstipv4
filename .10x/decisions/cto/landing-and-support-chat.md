# CTO — landing-and-support-chat (2026-10-23)
- Build, don't buy: a third-party chat widget would put prospect data outside Bawa and keep the inbox out of the admin console. Kenny asked for the inbox to be in the console.
- One deploy: the landing page ships inside the existing Vite SPA as a lazy chunk (ADR-007). If SEO later matters, revisit with a static site that reuses `docs/brand/`.
- Cost: no new services or dependencies; one additive migration.
