# ADR-002: Team invitations by email through Supabase Auth

**Status:** Accepted · **Date:** 2026-10-21 · **Feature:** team-invites-and-save-pattern

## Context
Invitations were copy-link only (project rule: no automatic sending). Kenny asked for invites delivered by email with clear status.

## Decision
Keep `jastip_invite_member` as the source of truth, then call `supabase.auth.signInWithOtp({ email, shouldCreateUser: true, emailRedirectTo: <app>/?invite=<id>, data: { invited: true } })` from the owner's browser. Supabase Auth sends the email; opening it signs the invitee in with a verified email; the app accepts the invitation and asks new users to set a password. The link is still copied as a fallback.

## Alternatives Considered
| Alternative | Why not |
|---|---|
| Edge Function with `auth.admin.inviteUserByEmail` (service role) | More infrastructure; service-role secret to manage; same SMTP needs |
| Third-party email API (Resend etc.) | New vendor + secret; still needs auth link handling |
| Copy link only | Rejected by Kenny |

## Consequences
+ No DB change, no secrets in the browser, email verified by the link.
− Supabase built-in mailer only reaches the project team and ~2 emails/hour → custom SMTP required in production. Anyone with the publishable key could already trigger OTP emails (standard Supabase), rate-limited by Supabase.
Risk: redirect URL must be allow-listed (`https://<domain>/**`), otherwise the link falls back to the Site URL and the invite id is lost (owner can resend / copy link).
