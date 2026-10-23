# Senior engineer — sprint-1-daily-ops (2026-10-23)
- Template rendering: replace `{key}` from a value map. Unknown keys stay as written, so typos are visible. Never use HTML; the output is text for the clipboard.
- Money in templates: `money(v, false, currency)`.
- `{rekening}` = "BCA 123 456 7890 a.n. Rina" when the bank fields are set, otherwise an empty string with the doubled spaces collapsed.
- **Demo mode:** shipping updates the order locally through `change()`, with the same eligibility check as the server (Purchased + paid ≥ total). Templates live in `data.messaging`.
- **Live mode:** `shipOrders` calls the RPC with `data.revision`, then installs the returned workspace via the store's existing install/reload path.
- Bulk ship eligibility is computed client-side first. The server re-checks atomically, and if it rejects, nothing changes.
