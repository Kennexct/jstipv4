# SRE — sprint-2-money-and-stock (2026-10-23)
**Load:** one extra RPC call per workspace revision (balances).

**Watch:** "Another user changed" during busy shopping days, when two people act on orders at once.

**Runbook**
- **Buyer says their credit is missing:** check Customers → Credit. Same-number check: a leading 0 equals 62. Audit shows "item unavailable (credit)".
- **Ship blocked on a paid order:** look for ongkir due in the drawer.
