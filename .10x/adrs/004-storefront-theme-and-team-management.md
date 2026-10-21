# ADR-004: Storefront theme on the workspace; member removal and invite edits

**Status:** Accepted · **Date:** 2026-10-21 · **Feature:** trip-currency-storefront-team

## Decision
- `jastip.workspaces.storefront jsonb` = `{ layout: marketplace|showcase|lookbook, accent: <palette key> }`, validated in `jastip_commit` (owner only, via p_shop) and returned by `jastip_load_workspace` and public `jastip_storefront`. Curated palette only (contrast-safe).
- New RPCs: `jastip_remove_member(p_workspace, p_member)` (owner; removes a member or cancels a pending invite; owner protected) and `jastip_update_invitation(p_workspace, p_invitation, p_email)` (owner; pending invites only). Joined members' emails are their login and cannot be edited here.
- Dashboard accent + "tinted" mode stay client preferences, synced to `auth.users.user_metadata.preferences` (no DB change).

## Alternatives
| Alternative | Why not |
|---|---|
| Storefront theme in a `records` row | Public RPC would need extra lookups; workspace column is simpler and owner-gated |
| Free hex colour | Kenny chose curated palette for readability |
| Delete auth users on removal | Not needed; removing membership revokes access |
