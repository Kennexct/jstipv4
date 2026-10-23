# ADR-008: Workspace settings table and a dedicated shipment RPC

**Status:** Accepted (Kenny approved the sprint plan, 2026-10-23) · **Date:** 2026-10-23 · **Feature:** sprint-1-daily-ops · **Author:** 10x-Team (Architect + Staff Engineer)

## Context
Sprint 1 needs two things:
- **Saved message templates with bank details.** These are workspace-level settings, editable by Owner and Manager. Today the only workspace settings path is `p_shop` in `jastip_commit`, which is Owner-only and rewrites the whole shop row.
- **Courier and resi recorded at the moment an order ships, including by Helpers, who usually pack.** The Helper rule in `validate_record` allows only `status/paid/payments/proof/note` to change.

## Decision
1. **New private table `jastip.workspace_settings`.** It is reached through `jastip_messaging` (read) and `jastip_save_messaging` (Owner/Manager write). It is separate from `workspaces`, so `jastip_commit` and `jastip_load_workspace` stay untouched.
2. **New RPC `jastip_ship_orders`.** It changes exactly `status`, `courier`, `resi` and `shippedAt`, and validates every order with the existing `validate_record` (as Manager), so the payment and purchase rules still hold. It keeps the workspace `revision` check and bump, and writes an audit row.
3. **`jastip_track_order` additionally returns `courier`, `resi` and `shippedAt`.**

## Alternatives considered
| Alternative | Pros | Cons | Why not |
|---|---|---|---|
| Templates inside `p_shop` | No new table | Owner-only; requires replacing the 60-line `jastip_commit` | Managers write the messages; high-risk edit |
| Templates in user preferences | Already synced | Per person, not per workspace; Helpers wouldn't see them | Wrong scope |
| Widen the Helper whitelist in `validate_record` | One path for all writes | Replacing the largest function for two fields | Risk outweighs benefit |
| Courier/resi through `jastip_commit` only | No new RPC | Helpers can't record shipments | Packers are often Helpers |

## Consequences
**Positive:** no rewrite of existing functions. Helpers can ship. Templates are shared by the team.
**Negative:** the client makes one extra RPC call on load to fetch the templates. There are now two write paths for orders (commit and ship); both bump the revision.
**Risks:** `jastip_ship_orders` passes role 'Manager' to `validate_record`. This is safe only because the RPC builds the new order from `old` plus the three fields. A test guards it.

## Dependencies
- `validate_record` (202610210002), `jastip_load_workspace`, `role_for`.
- Future buyer refunds (sprint 2) go on the same payment ledger via `jastip_commit`, not this RPC.
