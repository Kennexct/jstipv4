# DevOps — sprint-2-money-and-stock (2026-10-23)
**Deploy order**
1. Supabase SQL Editor: run `202610240001_sprint2_money_and_stock.sql`. It replaces `validate_record`, so run it before the frontend goes out. The current frontend keeps working with it: fee = 0 paths are unchanged.
2. Upload or merge the sprint 2 code.
3. CI green.
4. Vercel.

**Rollback**
- Revert the frontend.
- To roll back the database, re-run the `validate_record` body from 202610210002 (the new RPCs then fail closed, because they rely on the flags). Credits remain recorded.
