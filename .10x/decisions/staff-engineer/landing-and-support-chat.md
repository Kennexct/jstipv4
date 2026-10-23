# Staff engineer — landing-and-support-chat (2026-10-23)
- Reuse `I`, `Button`, `Field`, `Badge`, `Empty`, `Header`, `Tabs`, `BrandLockup`, `BrandMark`; tokens only (no new hex except brand vars); Geist; hairline borders; one accent.
- Landing CSS lives in its own lazy-loaded file so the dashboard CSS is unchanged in size.
- RPC conventions: `public.jastip_*` wrappers, `security definer set search_path=''`, explicit revoke then grant, errors as plain-English `raise exception`.
- Text from visitors is rendered as React text only, never as HTML.
- Prettier formatting; e2e uses role and label selectors.
