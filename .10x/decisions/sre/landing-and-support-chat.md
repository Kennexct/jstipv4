# SRE — landing-and-support-chat (2026-10-23)
**Load**
- An open widget polls every 5 s; a closed one every 30 s; hidden tabs don't poll.
- An admin Inbox refreshes every 15 s, plus the sidebar badge every 30 s.
- Negligible at the current scale.

**Signals**
- Spikes in the Supabase API logs for `jastip_chat_*`.
- "Too many requests" errors.
- Inbox thread count.

**Runbook**
- **Spam flood:** block the threads in the Inbox. If it continues, lower the limits in `jastip_chat_start` with a new migration.
- **Chat says "isn't set up yet":** the migration wasn't applied.
- **Admin sees onboarding at #Inbox:** an old frontend is cached; hard refresh.

**Not built:** alerting for new chats (owner checks the Inbox).
