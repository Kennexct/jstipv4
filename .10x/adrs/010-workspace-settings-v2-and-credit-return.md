# ADR-010: Workspace settings v2 (couriers, region) and partial credit return

**Status:** Accepted (Kenny, 2026-10-23 22:56) · **Feature:** feedback-round-1 · **Author:** 10x-Team (Architect + DBA + Security)

## Context
Kenny will launch Bawa beyond Indonesia, so courier names, the phone country code and the template language can't be fixed. Sellers also need to undo part of a credit payment. The ship RPC currently hard-codes an Indonesian courier list, and `phone_key` hard-codes 0 → 62.

## Decision
1. **Extend `jastip.workspace_settings` with `couriers jsonb` and `region jsonb`.**
   - New `jastip_settings(p_workspace)` (members read) returns `{messaging, couriers, region}`.
   - New `jastip_save_settings(p_workspace, p_value)` (Owner/Manager) validates and saves couriers and region.
   - `jastip_messaging`/`jastip_save_messaging` stay for compatibility.
2. **`jastip_ship_orders` is replaced.** Any courier name of 1–40 characters is allowed (no `<>`). Resi is required unless the saved courier says `tracking:false`. Names the workspace hasn't seen are appended to its list.
3. **`jastip.phone_key(p)` reads a transaction-local `jastip.calling_code`.**
   - `order_write_begin` and `credit_balance` set it from the workspace region; the default is 62.
   - Existing stored keys stay valid for Indonesian workspaces.
4. **`jastip_return_credit`** (Owner/Manager/Helper, like use credit):
   - appends a `credit-return` line and a credit `issue` row
   - is capped at credit used minus credit already returned
   - is allowed while the order is not Shipped/Delivered/Cancelled
   - lets Paid → Confirmed through the ledger flag
5. **`validate_record` v4** = v3 plus two changes: type `credit-return` (amount < 0) is allowed under `jastip.ledger`, and the Paid → Confirmed backwards step is allowed under `jastip.ledger` as well as `jastip.substitute`.

## Alternatives considered
| Alternative | Pros | Cons | Why not |
|---|---|---|---|
| Free-text courier with no list | Simplest | Typos split reports; the resi rule can't be per courier | A saved list keeps names consistent |
| A per-courier table | Relational | More RPCs and migrations for a short list | jsonb on settings is enough at this size |
| Phone stored normalised at order time | Fast lookups | Old orders keep raw input; a country change would need a backfill | A transaction-local code keeps old keys valid |
| Return credit as "undo" of the whole credit-use line | One click | Kenny wants to return part of it | User decision |

## Consequences
**Positive:**
- No country-specific constants on the server.
- Partial credit return keeps the append-only ledger.

**Negative:** `validate_record` is replaced a third time. Mitigation: the full SQL suite plus new tests.

**Risks:** changing the calling code after credits exist would split balances. Mitigation: Settings warns, and the code is locked once credits exist.
