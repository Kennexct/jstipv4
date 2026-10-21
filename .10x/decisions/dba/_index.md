# DBA — index
[DISCOVERED] Single migration supabase/migrations/202610100001_operations.sql (additive, transactional).
Indexes: records(workspace,kind,trip), records(workspace,kind,created_at), unique trackingToken.
Validation in jastip.validate_record; plan limits in jastip_commit. Issue: stock drift when qty/itemId edited on Requested/Quoted orders.
Rule: future changes = new additive migration + supabase/tests assertions.
