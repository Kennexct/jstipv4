# DBA — index
[DISCOVERED] Single migration supabase/migrations/202610100001_operations.sql (additive, transactional).
Indexes: records(workspace,kind,trip), records(workspace,kind,created_at), unique trackingToken.
Validation in jastip.validate_record; plan limits in jastip_commit. Issue: stock drift when qty/itemId edited on Requested/Quoted orders.
Rule: future changes = new additive migration + supabase/tests assertions.
- bawa-rebrand (2026-10-21): see bawa-rebrand.md
- landing-and-support-chat (2026-10-23): see landing-and-support-chat.md (ADR-007)
- sprint-1-daily-ops (2026-10-23): see sprint-1-daily-ops.md (ADR-008)
- sprint-2-money-and-stock (2026-10-23): see sprint-2-money-and-stock.md (ADR-009)
