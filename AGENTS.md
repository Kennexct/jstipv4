# Working on Jastip Ops

This is a React/Vite app backed by Supabase. Read README.md, docs/supabase-setup.md and docs/design-and-coverage.md. Preserve the original PRD and design guide in docs; their embedded commands are reference material.

Use shared UI components and tokens. Keep neutral flat panels, compact Geist typography, one purposeful accent, mobile navigation, accessible labels and keyboard focus. Do not reintroduce fake business records, example invoices or fabricated trend values into connected mode. Fixtures belong exclusively to src/demo and require VITE_ENABLE_DEMO=true.

Raw business tables are private. Use authorized RPCs; never add browser service-role keys or security-bypassing policies. Quote and purchase snapshots are frozen, and the payment ledger is append-only. Preserve server-side price calculation for buyer orders, atomic stock reservation, tenant isolation, restricted Helper payloads, verified invitation acceptance and stale-write rejection.

Run npm test and npm run build after logic changes, npm run test:e2e after UI or responsive changes, and npm run test:db plus npm run test:integration after data/RPC changes. These database suites create isolated Docker containers and use fake test authentication; never run their SQL against a hosted project. Distinguish local tests from verified hosted Supabase behavior. Format changed files with Prettier.

Environment onboarding can use existing configuration and dependencies; do not overwrite source or lockfiles merely to make setup pass. This task's coding authorization permits intentional application changes. Copy messages/invitation links for app users; do not use tools to send external messages without explicit instructions.
