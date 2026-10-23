# Security — sprint-1-daily-ops (2026-10-23)
**Templates**
- Plain text only, used as clipboard output; never rendered as HTML.
- Unknown keys dropped; length caps.
- Bank details are readable by all members, including Helpers. This is intended: they send the messages. It is not financial-cost data, so the Helper field rule doesn't apply.

**`jastip_ship_orders`**
- It passes role 'Manager' to `validate_record` only to bypass the Helper field lock.
- It is safe because the record is rebuilt server-side as `old || {status, courier, resi, shippedAt}`. A test asserts nothing else changes.
- The Shipped rules still hold (purchased and fully paid), as do the revision check and the audit entry.
- The returned workspace is filtered for the caller's role (a test checks Helpers get no `quotedCost`).

**Resi:** format `^[A-Z0-9-]{4,40}$` server-side; courier from a fixed list.

**Tracking deep link**
- The token is in the URL hash, which isn't sent to servers or logs, but it does stay in browser history. That's the same exposure as the copied token.
- The page still shows no buyer identity (tested).

**Invariants kept:**
- copy-only messaging (no `wa.me`, per Kenny)
- RPC-only access
- stale-write rejection
- money rules unchanged
