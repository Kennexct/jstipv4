begin;
-- Additive migration (ADR-007): landing-page support chat between visitors and the platform owner.
-- Private tables, RPC-only access. Visitors are identified by a one-time token stored only as a sha256 hash.
create table if not exists jastip.support_threads (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 name text not null check(length(name) between 1 and 60),
 contact text not null default '' check(length(contact)<=120),
 status text not null default 'Open' check(status in ('Open','Closed','Blocked')),
 ip_hash text not null default '',
 created_at timestamptz not null default now(),
 last_message_at timestamptz not null default now(),
 admin_read_at timestamptz,
 visitor_read_at timestamptz
);
create table if not exists jastip.support_messages (
 id bigint generated always as identity primary key,
 thread_id uuid not null references jastip.support_threads(id),
 sender text not null check(sender in ('visitor','admin')),
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists support_messages_thread on jastip.support_messages(thread_id,id);
create index if not exists support_threads_recent on jastip.support_threads(last_message_at desc);
alter table jastip.support_threads enable row level security;
alter table jastip.support_messages enable row level security;
revoke all on jastip.support_threads,jastip.support_messages from public,anon,authenticated;

-- Hashed client address from the PostgREST request headers. Never stored or used in plain text.
-- Prefer the address set by Supabase's edge (cf-connecting-ip); x-forwarded-for can be supplied by the client.
create or replace function jastip.chat_client() returns text language plpgsql stable security definer set search_path='' as $$
declare h json;v text;begin
 begin h:=current_setting('request.headers',true)::json;exception when others then h:=null;end;
 v:=btrim(coalesce(nullif(h->>'cf-connecting-ip',''),nullif(h->>'x-real-ip',''),split_part(h->>'x-forwarded-for',',',1)));
 return encode(sha256(convert_to(coalesce(nullif(v,''),'unknown'),'UTF8')),'hex');end$$;
create or replace function jastip.chat_thread(p_thread uuid,p_token text) returns jastip.support_threads language plpgsql security definer set search_path='' as $$
declare t jastip.support_threads;begin
 select * into t from jastip.support_threads where id=p_thread and token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');
 if t.id is null then raise exception 'Conversation not found. Start a new one.';end if;
 return t;end$$;
create or replace function jastip.chat_body(p_body text) returns text language plpgsql immutable set search_path='' as $$
declare v text:=btrim(coalesce(p_body,''));begin
 if length(v)=0 then raise exception 'Write a message first.';end if;
 if length(v)>2000 then raise exception 'Messages can be up to 2,000 characters.';end if;
 return v;end$$;
create or replace function jastip.chat_messages(p_thread uuid,p_after bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'sender',sender,'body',body,'date',created_at) order by id),'[]'::jsonb)
 from jastip.support_messages where thread_id=p_thread and id>coalesce(p_after,0)$$;

-- Visitor RPCs (anon + authenticated).
create or replace function public.jastip_chat_start(p_name text,p_contact text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ip text:=jastip.chat_client();token text;t uuid;n text:=btrim(coalesce(p_name,''));c text:=btrim(coalesce(p_contact,''));b text;begin
 if length(n)=0 then raise exception 'Add your name so we know who we''re talking to.';end if;
 if length(n)>60 then raise exception 'Names can be up to 60 characters.';end if;
 if length(c)>120 then raise exception 'Contact details can be up to 120 characters.';end if;
 b:=jastip.chat_body(p_body);
 perform jastip.limit_request('chat-ip:'||ip,5);
 perform jastip.limit_request('chat-global',200);
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into jastip.support_threads(token_hash,name,contact,ip_hash) values(encode(sha256(convert_to(token,'UTF8')),'hex'),n,c,ip) returning id into t;
 insert into jastip.support_messages(thread_id,sender,body) values(t,'visitor',b);
 return jsonb_build_object('thread',t,'token',token,'status','Open','messages',jastip.chat_messages(t,0));end$$;
create or replace function public.jastip_chat_send(p_thread uuid,p_token text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t jastip.support_threads:=jastip.chat_thread(p_thread,p_token);b text:=jastip.chat_body(p_body);m bigint;begin
 if t.status<>'Open' then raise exception 'This conversation is closed. Start a new one.';end if;
 perform jastip.limit_request('chat-thread:'||t.id::text,20);
 insert into jastip.support_messages(thread_id,sender,body) values(t.id,'visitor',b) returning id into m;
 update jastip.support_threads set last_message_at=now() where id=t.id;
 return jsonb_build_object('status',t.status,'messages',jastip.chat_messages(t.id,m-1));end$$;
create or replace function public.jastip_chat_poll(p_thread uuid,p_token text,p_after bigint default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare t jastip.support_threads:=jastip.chat_thread(p_thread,p_token);begin
 update jastip.support_threads set visitor_read_at=now() where id=t.id;
 -- A blocked visitor sees the same message as a closed thread.
 return jsonb_build_object('status',case when t.status='Blocked' then 'Closed' else t.status end,'messages',jastip.chat_messages(t.id,p_after));end$$;

-- Platform owner RPCs (authenticated + jastip.is_admin()).
create or replace function public.jastip_admin_chats() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.name,'contact',t.contact,'status',t.status,'created',t.created_at,'updated',t.last_message_at,
  'last',(select jsonb_build_object('sender',m.sender,'body',left(m.body,140)) from jastip.support_messages m where m.thread_id=t.id order by m.id desc limit 1),
  'unread',(select count(*) from jastip.support_messages m where m.thread_id=t.id and m.sender='visitor' and m.created_at>coalesce(t.admin_read_at,'-infinity'::timestamptz))
 ) order by t.last_message_at desc) from (select * from jastip.support_threads order by last_message_at desc limit 300) t),'[]'::jsonb);end$$;
create or replace function public.jastip_admin_chat(p_thread uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t jastip.support_threads;begin
 if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 update jastip.support_threads set admin_read_at=now() where id=p_thread returning * into t;
 if t.id is null then raise exception 'Conversation not found.';end if;
 return jsonb_build_object('id',t.id,'name',t.name,'contact',t.contact,'status',t.status,'created',t.created_at,
  'visitorRead',t.visitor_read_at,'messages',jastip.chat_messages(t.id,0));end$$;
create or replace function public.jastip_admin_chat_reply(p_thread uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b text;t jastip.support_threads;begin
 if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 b:=jastip.chat_body(p_body);
 select * into t from jastip.support_threads where id=p_thread for update;
 if t.id is null then raise exception 'Conversation not found.';end if;
 if t.status='Blocked' then raise exception 'Unblock this conversation before replying.';end if;
 insert into jastip.support_messages(thread_id,sender,body) values(t.id,'admin',b);
 update jastip.support_threads set last_message_at=now(),admin_read_at=now(),status='Open' where id=t.id;
 return public.jastip_admin_chat(t.id);end$$;
create or replace function public.jastip_admin_chat_status(p_thread uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid;n text;begin
 if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 if p_status not in ('Open','Closed','Blocked') then raise exception 'Unknown conversation status.';end if;
 update jastip.support_threads set status=p_status where id=p_thread returning id,name into t,n;
 if t is null then raise exception 'Conversation not found.';end if;
 insert into jastip.audit(workspace_id,actor,event) values(null,auth.uid(),'Support chat with '||n||' marked '||lower(p_status));
 return public.jastip_admin_chat(t);end$$;

revoke all on function jastip.chat_client(),jastip.chat_thread(uuid,text),jastip.chat_body(text),jastip.chat_messages(uuid,bigint) from public,anon,authenticated;
revoke all on function public.jastip_chat_start(text,text,text),public.jastip_chat_send(uuid,text,text),public.jastip_chat_poll(uuid,text,bigint),
 public.jastip_admin_chats(),public.jastip_admin_chat(uuid),public.jastip_admin_chat_reply(uuid,text),public.jastip_admin_chat_status(uuid,text) from public,anon,authenticated;
grant execute on function public.jastip_chat_start(text,text,text),public.jastip_chat_send(uuid,text,text),public.jastip_chat_poll(uuid,text,bigint) to anon,authenticated;
grant execute on function public.jastip_admin_chats(),public.jastip_admin_chat(uuid),public.jastip_admin_chat_reply(uuid,text),public.jastip_admin_chat_status(uuid,text) to authenticated;
commit;
