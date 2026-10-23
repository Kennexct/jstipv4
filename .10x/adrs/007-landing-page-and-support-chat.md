# ADR-007: Landing page in the SPA and token-based support chat over RPCs

**Status:** Accepted (Kenny, 2026-10-23) · **Date:** 2026-10-23 · **Feature:** landing-and-support-chat · **Author:** 10x-Team (Architect + Staff Engineer)

## Context
Bawa needs a public introduction (what it is, how it works, prices) and a way for prospects to ask questions. Kenny wants the conversation to land in the admin console and be answered there. Constraints:
- deploy is cloud-only (Vercel + hosted Supabase)
- the browser never touches `jastip.*` tables
- nothing is sent outbound
- no fake data in connected mode
- visitors have no account

## Decision
1. **The landing page lives in the existing Vite SPA** as a lazy-loaded `src/landing/` chunk. It shows at `/` when signed out and always at `#Home`. It reuses tokens, `ui.jsx` and `brand.jsx`. The sample rows in its product preview are static, labelled "Example data", and kept apart from `src/demo/` and from any workspace.
2. **Support chat is two new private tables plus SECURITY DEFINER RPCs.**
   - Each visitor thread is identified by a server-generated token (two v4 UUIDs, 244 random bits). It is returned once and stored only as a sha256 hash.
   - The visitor polls for replies.
   - Admin RPCs are gated by `jastip.is_admin()`.
   - Abuse control reuses `jastip.limit_request`, keyed on a hashed IP, a global bucket and the thread.

## Alternatives considered
| Alternative | Pros | Cons | Why not |
|---|---|---|---|
| Separate static marketing site (Astro / plain HTML) | Best SEO, independent deploys | Second project and deploy, and brand components get duplicated | More moving parts than the value justifies today |
| Store chats in `jastip.records` | No new tables | Records need a workspace id, and visitors have none. It would also bump workspace `revision` and add save conflicts | Wrong home for platform-level data |
| Supabase Realtime for replies | Instant | Needs table-level RLS select policies for anon, which breaks the RPC-only rule | Polling at 5 s is fine for this volume |
| Third-party chat widget (Crisp, Tawk) | Zero backend work | Prospect data goes to a third party, the inbox is outside the admin console, and it adds a script tag | Kenny asked for chat in the admin console |
| Anonymous Supabase Auth sign-in | Real auth identity | Requires enabling anonymous sign-ins on hosted Supabase, and creates auth users for every visitor | Token-hash approach needs no dashboard change |

## Consequences
**Positive**
- One deploy.
- The admin console gets a real inbox.
- Visitor identity never leaves Bawa.
- The migration is purely additive.

**Negative**
- The SPA bundle serves the marketing page. The lazy chunk keeps the dashboard size unchanged, but SEO is limited to `index.html` meta.
- Polling adds about 12 requests per minute per open widget (2 per minute when closed).
- The owner is not alerted to new chats outside the console.

**Risks and mitigations**
- **Spam:** IP, global and thread rate limits, a Block action, and the 2,000-character cap.
- **Token theft from localStorage:** a stolen token only exposes that visitor's own thread.
- **x-forwarded-for spoofing:** the global bucket still caps the total.

## Dependencies
- `jastip.limit_request` and `jastip.is_admin()` from migration 202610100001.
- Core PostgreSQL only: `gen_random_uuid()` and `sha256()` (PG 11+). There is no pgcrypto dependency, so the same SQL runs on hosted Supabase and in the CI container.
- This decision constrains a future merchant-facing support chat: it should reuse these tables with a `workspace_id` column.
