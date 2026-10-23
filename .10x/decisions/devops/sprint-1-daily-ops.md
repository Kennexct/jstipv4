# DevOps — sprint-1-daily-ops (2026-10-23)
**Deploy order**
1. Run `202610220001_support_chat.sql` (landing page), then `202610230001_sprint1_messages_shipping.sql`, in the Supabase SQL Editor.
2. Apply the landing patch, then the sprint 1 patch (stacked), or merge `feature/landing-and-support-chat` and then `feature/sprint-1-daily-ops`.
3. Check that CI is green; Vercel deploys.

**Rollback:** revert the sprint 1 commits. The new table and functions are unused without the frontend. The replaced `jastip_track_order` only adds fields, so the old frontend still works.
