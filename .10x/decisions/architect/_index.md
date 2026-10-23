# Architect — index
[DISCOVERED] SPA with hash routing; single OpsContext store; all writes via jastip_commit diff batches.
[DISCOVERED] Data: one JSONB table jastip.records (workspace, kind, id) + relational workspaces/members/invitations/audit/rate_limits.
[DISCOVERED] Concurrency: workspace-level revision optimistic lock (coarse — buyer orders cause seller save conflicts).
Failure modes: stale revision, plan limits, suspended/expired workspace, migration missing (PGRST202).
- bawa-rebrand (2026-10-21): see bawa-rebrand.md — ADR-005 surface-only rename to Bawa
- apk-photo-picker (2026-10-21): see apk-photo-picker.md (ADR-006)
- landing-and-support-chat (2026-10-23): see landing-and-support-chat.md (ADR-007)
- sprint-1-daily-ops (2026-10-23): see sprint-1-daily-ops.md (ADR-008)
- sprint-2-money-and-stock (2026-10-23): see sprint-2-money-and-stock.md (ADR-009)
- feedback-round-1 (2026-10-23): see feedback-round-1.md (ADR-010)
