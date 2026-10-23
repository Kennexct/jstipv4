# Security review — support chat (2026-10-23)
**Verdict:** no blocking issues. One issue was found and fixed during review: the per-client rate-limit key used a spoofable first `x-forwarded-for` value. It now prefers `cf-connecting-ip`, and there is a test for this.

Controls and residual risks are in `decisions/security/landing-and-support-chat.md`.

**Follow-ups**
- Privacy-policy line about chat contact details.
- An optional retention job for closed threads older than 12 months.
