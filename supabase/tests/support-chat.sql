-- Support chat (ADR-007). Runs after security-and-workflows.sql on the same isolated database.
create or replace function public.test_assert(p boolean,message text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'ASSERTION: %',message;end if;end$$;
create or replace function public.test_denied(statement text,expected text) returns void language plpgsql as $$begin begin execute statement;exception when others then if position(expected in sqlerrm)=0 then raise exception 'Wrong error: % (expected %)',sqlerrm,expected;end if;return;end;raise exception 'Expected rejection: %',expected;end$$;
grant execute on function public.test_assert(boolean,text),public.test_denied(text,text) to anon,authenticated;
reset role;
delete from jastip.rate_limits where bucket like 'chat%';
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-0000-0000-000000000009','visitor-owner@example.com',now()) on conflict do nothing;
insert into jastip.platform_admins values('00000000-0000-0000-0000-000000000004') on conflict do nothing;

-- Visitor: start, send, poll.
set role anon;set request.jwt.claim.sub='';
select set_config('test.chat',public.jastip_chat_start('Sari','sari@example.com','  Hi, does Bawa work for Korea trips?  ')::text,false);
select public.test_assert(length(current_setting('test.chat')::jsonb->>'token')=64,'Visitor token is 64 hex characters');
select public.test_assert(current_setting('test.chat')::jsonb->'messages'->0->>'body'='Hi, does Bawa work for Korea trips?','Message body is trimmed and stored');
select public.test_assert(not (current_setting('test.chat')::jsonb->'messages'->0 ? 'thread_id'),'Messages do not leak internal columns');
select public.jastip_chat_send((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token','And what currency do you support?');
select public.test_assert(jsonb_array_length(public.jastip_chat_poll((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token',0)->'messages')=2,'Visitor sees both messages');
select public.test_denied($q$select public.jastip_chat_poll((current_setting('test.chat')::jsonb->>'thread')::uuid,'wrong-token',0)$q$,'Conversation not found');
select public.test_denied($q$select public.jastip_chat_send((current_setting('test.chat')::jsonb->>'thread')::uuid,'wrong-token','hi')$q$,'Conversation not found');
select public.test_denied($q$select public.jastip_chat_start('','','Hello')$q$,'Add your name');
select public.test_denied($q$select public.jastip_chat_start('Sari','','   ')$q$,'Write a message first');
select public.test_denied($q$select public.jastip_chat_start('Sari','',repeat('a',2001))$q$,'up to 2,000 characters');
select public.test_denied($q$select public.jastip_chat_start(repeat('n',61),'','Hi')$q$,'up to 60 characters');
-- No direct table access and no admin RPCs for visitors.
select public.test_denied('select count(*) from jastip.support_threads','permission denied');
select public.test_denied('select count(*) from jastip.support_messages','permission denied');
select public.test_denied('select public.jastip_admin_chats()','permission denied');
select public.test_denied('select jastip.chat_messages(gen_random_uuid(),0)','permission denied');

-- Signed-in non-admin cannot read the inbox.
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000009';
select public.test_denied('select public.jastip_admin_chats()','Platform access denied');
select public.test_denied($q$select public.jastip_admin_chat_reply((current_setting('test.chat')::jsonb->>'thread')::uuid,'hi')$q$,'Platform access denied');
select public.test_denied($q$select public.jastip_admin_chat_status((current_setting('test.chat')::jsonb->>'thread')::uuid,'Blocked')$q$,'Platform access denied');

-- Admin: list, read, reply, close, block.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.test_assert((public.jastip_admin_chats()->0->>'unread')::int=2,'Admin sees two unread visitor messages');
select public.test_assert(not (public.jastip_admin_chats()->0 ? 'token_hash'),'Admin list never exposes token hashes');
select public.test_assert(not (public.jastip_admin_chats()->0 ? 'ip_hash'),'Admin list never exposes client hashes');
select public.test_assert(public.jastip_admin_chat((current_setting('test.chat')::jsonb->>'thread')::uuid)->>'contact'='sari@example.com','Admin sees visitor contact');
select public.test_assert((public.jastip_admin_chats()->0->>'unread')::int=0,'Opening a conversation marks it read');
select public.jastip_admin_chat_reply((current_setting('test.chat')::jsonb->>'thread')::uuid,'Yes! Set the trip currency to KRW.');
select public.test_denied($q$select public.jastip_admin_chat_reply((current_setting('test.chat')::jsonb->>'thread')::uuid,'')$q$,'Write a message first');
select public.test_denied($q$select public.jastip_admin_chat_status((current_setting('test.chat')::jsonb->>'thread')::uuid,'Deleted')$q$,'Unknown conversation status');

reset role;set role anon;set request.jwt.claim.sub='';
select public.test_assert(public.jastip_chat_poll((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token',2)->'messages'->0->>'sender'='admin','Visitor receives the admin reply');
select public.test_assert(jsonb_array_length(public.jastip_chat_poll((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token',3)->'messages')=0,'Polling after the last id returns nothing new');

reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.jastip_admin_chat_status((current_setting('test.chat')::jsonb->>'thread')::uuid,'Closed');
reset role;set role anon;set request.jwt.claim.sub='';
select public.test_denied($q$select public.jastip_chat_send((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token','Still there?')$q$,'conversation is closed');
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.jastip_admin_chat_status((current_setting('test.chat')::jsonb->>'thread')::uuid,'Blocked');
select public.test_denied($q$select public.jastip_admin_chat_reply((current_setting('test.chat')::jsonb->>'thread')::uuid,'hi')$q$,'Unblock this conversation');
reset role;
select public.test_assert(exists(select 1 from jastip.audit where event='Support chat with Sari marked blocked'),'Status changes are audited');
select public.test_assert((select count(*) from jastip.support_messages where thread_id=(current_setting('test.chat')::jsonb->>'thread')::uuid)=3,'Messages are kept after block');
set role anon;set request.jwt.claim.sub='';
select public.test_assert(public.jastip_chat_poll((current_setting('test.chat')::jsonb->>'thread')::uuid,current_setting('test.chat')::jsonb->>'token',0)->>'status'='Closed','Blocked threads look closed to the visitor');

-- Rate limits: one client can open at most 5 conversations per 10 minutes (1 already used above).
select public.jastip_chat_start('B','','one');select public.jastip_chat_start('B','','two');
select public.jastip_chat_start('B','','three');select public.jastip_chat_start('B','','four');
select public.test_denied($q$select public.jastip_chat_start('B','','six')$q$,'Too many requests');
reset role;delete from jastip.rate_limits where bucket like 'chat%';set role anon;
do $$declare c jsonb:=public.jastip_chat_start('Flood','','start');begin
 for i in 1..20 loop perform public.jastip_chat_send((c->>'thread')::uuid,c->>'token','m'||i);end loop;
 perform public.test_denied(format('select public.jastip_chat_send(%L::uuid,%L,%L)',c->>'thread',c->>'token','too many'),'Too many requests');end$$;
-- The rate-limit key prefers the edge address over a client-supplied x-forwarded-for.
reset role;
select set_config('request.headers','{"cf-connecting-ip":"203.0.113.9","x-forwarded-for":"1.1.1.1"}',false);
select public.test_assert(jastip.chat_client()=encode(sha256(convert_to('203.0.113.9','UTF8')),'hex'),'Client key uses cf-connecting-ip');
select set_config('request.headers','not json',false);
select public.test_assert(jastip.chat_client()=encode(sha256(convert_to('unknown','UTF8')),'hex'),'Malformed headers fall back safely');
select set_config('request.headers','',false);
select 'PASS: support chat start/send/poll, token check, validation, privacy, admin-only inbox, read state, replies, close/block, audit and rate limits.';
