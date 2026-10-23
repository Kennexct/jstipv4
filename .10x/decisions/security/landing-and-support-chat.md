# Security — landing-and-support-chat (2026-10-23)
**Threat model**
- Anonymous visitors can write to the database.
- Owner-only inbox.
- Visitor identity is a bearer token in localStorage.

**Controls**
- Private tables; RPC-only; `security definer` with `search_path=''`; explicit revoke/grant.
- Anon cannot read the tables or helper functions (tested).
- Token: 244 random bits, shown once, stored only as a sha256 hash. Lookup requires id and hash together. A wrong token gives the same error as an unknown thread.
- Admin RPCs check `jastip.is_admin()`. A non-admin signed-in user is denied (tested). Admin output never includes `token_hash` or `ip_hash` (tested).
- **Abuse limits:**
  - 5 new threads per client per 10 min
  - 200 new threads globally per 10 min
  - 20 messages per thread per 10 min
  - lengths enforced on the server
  - Block action; a blocked visitor sees "closed" and cannot send
- Client key = sha256 of `cf-connecting-ip` (falls back to `x-real-ip`, then `x-forwarded-for`). The raw IP is never stored.
- XSS: all visitor text is rendered as React text with `white-space: pre-wrap`. There is no HTML rendering.
- Invariants kept: no outbound sending, no service key, workspace data untouched, the `revision` lock is unaffected.

**Residual risk**
- Someone can exhaust the global bucket and deny new chats for 10 minutes. Accepted at this scale; watch the Inbox.
- The token sits in localStorage: anyone using the same browser can read that one thread.
- Prospects' contact details are personal data. They are kept indefinitely (nothing is deleted); add a retention note to the privacy policy.
