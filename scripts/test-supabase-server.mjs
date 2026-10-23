// Test-only Supabase RPC transport. Uses real PostgreSQL and simplified test JWTs.
// The production app always uses Supabase Auth; this server is never deployed.
import http from 'node:http';
import { startDatabase, stopDatabase, sql } from './test-database.mjs';
const container = 'jastip-integration-' + process.pid;
await startDatabase(container);
sql(
  container,
  `insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-0000-0000-000000000001','owner@example.com',now()),('00000000-0000-0000-0000-000000000004','admin@example.com',now()),('00000000-0000-0000-0000-000000000005','helper@example.com',now());insert into jastip.platform_admins values('00000000-0000-0000-0000-000000000004');`,
);
const args = {
  jastip_create_workspace: ['p_name', 'p_slug'],
  jastip_load_workspace: ['p_workspace'],
  jastip_commit: ['p_workspace', 'p_revision', 'p_changes', 'p_shop', 'p_event'],
  jastip_storefront: ['p_slug'],
  jastip_place_order: ['p_slug', 'p_order'],
  jastip_track_order: ['p_token'],
  jastip_invite_member: ['p_workspace', 'p_email', 'p_role'],
  jastip_accept_invitation: ['p_invitation'],
  jastip_set_member_role: ['p_workspace', 'p_member', 'p_role'],
  jastip_remove_member: ['p_workspace', 'p_member'],
  jastip_update_invitation: ['p_workspace', 'p_invitation', 'p_email'],
  jastip_platform: [],
  jastip_admin_action: ['p_workspace', 'p_action', 'p_value'],
  jastip_report_store: ['p_slug', 'p_note'],
  jastip_resolve_report: ['p_workspace', 'p_report'],
  jastip_chat_start: ['p_name', 'p_contact', 'p_body'],
  jastip_chat_send: ['p_thread', 'p_token', 'p_body'],
  jastip_chat_poll: ['p_thread', 'p_token', 'p_after'],
  jastip_admin_chats: [],
  jastip_admin_chat: ['p_thread'],
  jastip_admin_chat_reply: ['p_thread', 'p_body'],
  jastip_admin_chat_status: ['p_thread', 'p_status'],
  jastip_messaging: ['p_workspace'],
  jastip_save_messaging: ['p_workspace', 'p_value'],
  jastip_ship_orders: ['p_workspace', 'p_revision', 'p_shipments'],
  jastip_order_unavailable: ['p_workspace', 'p_revision', 'p_order_id', 'p_mode', 'p_note'],
  jastip_order_refund: ['p_workspace', 'p_revision', 'p_order_id', 'p_amount', 'p_mode', 'p_note'],
  jastip_use_credit: ['p_workspace', 'p_revision', 'p_order_id', 'p_amount'],
  jastip_substitute_order: [
    'p_workspace',
    'p_revision',
    'p_order_id',
    'p_change',
    'p_excess_mode',
    'p_note',
  ],
  jastip_buyer_credits: ['p_workspace'],
};
const emails = [];
const jsonArgs = new Set(['p_changes', 'p_shop', 'p_order', 'p_value', 'p_shipments', 'p_change']);
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ||
      'authorization,apikey,content-type,x-client-info',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === '/health') {
    res.end('{}');
    return;
  }
  // Test stand-ins for Supabase Auth email links: record what would be emailed.
  if (req.url?.startsWith('/auth/v1/otp')) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    emails.push({
      ...JSON.parse(raw || '{}'),
      redirect: new URL(req.url, 'http://x').searchParams.get('redirect_to'),
    });
    res.end('{}');
    return;
  }
  if (req.url === '/test/emails') {
    res.end(JSON.stringify(emails));
    return;
  }
  if (req.url?.startsWith('/auth/v1/user') && req.method === 'PUT') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    res.end(
      JSON.stringify({
        id: '00000000-0000-0000-0000-000000000005',
        email: 'helper@example.com',
        aud: 'authenticated',
        user_metadata: { invited: true, ...(body.data || {}) },
      }),
    );
    return;
  }
  const name = req.url?.split('/').at(-1);
  if (!args[name]) {
    res.writeHead(404);
    res.end('{}');
    return;
  }
  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    let id = '';
    try {
      id =
        JSON.parse(
          Buffer.from((req.headers.authorization?.slice(7) || '').split('.')[1], 'base64url'),
        ).sub || '';
    } catch {}
    if (
      id &&
      ![
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
      ].includes(id)
    )
      throw Error('Unknown test user');
    const params = args[name].map((k) =>
      body[k] == null
        ? 'null'
        : jsonArgs.has(k)
          ? quote(JSON.stringify(body[k])) + '::jsonb'
          : quote(body[k]),
    );
    const value = sql(
      container,
      `set role ${id ? 'authenticated' : 'anon'};select set_config('request.jwt.claim.sub',${quote(id)},false);select coalesce(to_jsonb(public.${name}(${params.join(',')}))::text,'null');`,
    )
      .split('\n')
      .at(-1);
    res.end(value || 'null');
  } catch (e) {
    res.writeHead(400);
    res.end(
      JSON.stringify({
        code: 'P0001',
        message:
          (e.stderr?.toString() || e.message)
            .split('\n')
            .find((l) => l.startsWith('ERROR:'))
            ?.replace(/^ERROR:\s*/, '') || e.message,
      }),
    );
  }
});
server.listen(54329, '127.0.0.1', () =>
  console.log('Isolated PostgreSQL-backed Supabase test transport ready.'),
);
function close() {
  server.close();
  stopDatabase(container);
  process.exit();
}
process.on('SIGTERM', close);
process.on('SIGINT', close);
