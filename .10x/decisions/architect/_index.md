# Architect — index
[DISCOVERED] SPA with hash routing; single OpsContext store; all writes via jastip_commit diff batches.
[DISCOVERED] Data: one JSONB table jastip.records (workspace, kind, id) + relational workspaces/members/invitations/audit/rate_limits.
[DISCOVERED] Concurrency: workspace-level revision optimistic lock (coarse — buyer orders cause seller save conflicts).
Failure modes: stale revision, plan limits, suspended/expired workspace, migration missing (PGRST202).
- bawa-rebrand (2026-10-21): see bawa-rebrand.md — ADR-005 surface-only rename to Bawa
