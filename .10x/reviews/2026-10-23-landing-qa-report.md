# QA report — landing page + support chat (2026-10-23)
**Verdict:** ready to deploy after the migration is applied. All local suites pass:
- unit 13/13
- build
- db 2/2 files
- e2e 19/19
- integration 4/4

See `decisions/qa/landing-and-support-chat.md` for coverage and the bugs fixed.

**Manual checks on Vercel after deploy**
1. A private window at the root shows the landing page.
2. Get started → sign-up → About Bawa returns.
3. Send a chat.
4. Admin → Inbox shows the badge; reply.
5. The visitor sees the reply within 5 s.
6. Signed-in users still land on Overview.
7. The APK still opens to sign-in.
