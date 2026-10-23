# DevOps — landing-and-support-chat (2026-10-23)
**Deploy order**
1. Run `supabase/migrations/202610220001_support_chat.sql` in the Supabase SQL Editor.
2. Push the branch and merge it.
3. Check that GitHub Actions "Validate Bawa" is green.
4. Vercel deploys.

**Notes**
- No new env vars. The new npm dependency `@fontsource/space-grotesk` is in the lockfile.
- APK: unaffected (the landing page is skipped on native). The next APK build just includes the code.

**Rollback**
- Revert the merge commit; the landing page disappears and the root shows sign-in again.
- The tables can stay; they are unused without the frontend. No down-migration is needed.
