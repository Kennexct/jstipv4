# Senior engineer — landing-and-support-chat (2026-10-23)
- Token: `replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','')`, hash `encode(sha256(convert_to(token,'UTF8')),'hex')`. Look up the thread by id and hash together, so timing doesn't reveal whether a thread id exists.
- IP: `coalesce(split_part(current_setting('request.headers',true)::json->>'x-forwarded-for',',',1),'unknown')`. Guard the JSON cast with an exception block.
- Poll returns `{status, messages[after]}` with `id > p_after`. Ids are bigint identity, so ordering is stable.
- Admin list returns `unread = exists visitor msg created_at > coalesce(admin_read_at,'-infinity')`.
- Widget: an effect with an interval keyed on `open` + `thread`. Clear it on unmount; skip a tick when `document.hidden`. Dedupe messages by id.
- Lazy import: `const Landing = React.lazy(() => import('./landing/Landing'))` with `<Suspense fallback={<Loader brand/>}>`.
- Tricky part: the store's `reload()` sets `connection='signedout'` at the root, so main.jsx must check landing conditions *before* returning `ConnectionGate`.
