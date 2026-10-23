# SRE — sprint-1-daily-ops (2026-10-23)
**Load:** one extra RPC call per workspace load (templates); bulk ship is a single RPC call for up to 100 orders.

**Watch:** "Another user changed" errors on ship during busy packing days (two people shipping at once). This is the same revision lock; retry after the refresh.

**Runbook**
- Messages tab says "need the latest database update": migration 202610230001 isn't applied.
- Ship fails "Choose a courier": the frontend is older than the database. Hard refresh.
