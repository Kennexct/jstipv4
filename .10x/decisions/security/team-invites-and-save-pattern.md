# Security — team-invites (2026-10-21)
- No service-role key; OTP uses publishable key. Acceptance still enforced server-side (`jastip_accept_invitation` checks verified email == invited email).
- Invite id travels in the redirect URL; it is useless without signing in as the invited verified email.
- Email abuse: Supabase Auth rate limits apply; configure custom SMTP limits/captcha if abused.
- Password set via `auth.updateUser` (min 12 chars client-side; Supabase password policy server-side).
