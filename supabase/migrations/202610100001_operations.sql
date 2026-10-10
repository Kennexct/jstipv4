begin;
-- Additive migration: no existing application tables or data are dropped.
create schema if not exists jastip;
create table if not exists jastip.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'), bio text not null default '',
 contact text not null default '', plan text not null default 'Starter' check(plan in ('Starter','Pro','Business')),
 status text not null default 'Active' check(status in ('Invited','Trial','Active','Past due','Suspended','Closed')),
 trial_ends_at timestamptz, revision bigint not null default 0, created_at timestamptz not null default now()
);
create table if not exists jastip.members (
 workspace_id uuid not null references jastip.workspaces(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('Owner','Manager','Helper')), primary key(workspace_id,user_id)
);
create table if not exists jastip.platform_admins(user_id uuid primary key references auth.users(id));
create table if not exists jastip.records (
 workspace_id uuid not null references jastip.workspaces(id), kind text not null check(kind in ('items','orders','trips','budgets','customers','notes','invoices','reports')),
 id text not null check(length(id) between 1 and 100), data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<1000000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(), primary key(workspace_id,kind,id)
);
create index if not exists records_trip on jastip.records(workspace_id,kind,(data->>'trip'));
create unique index if not exists records_tracking_token on jastip.records((data->>'trackingToken')) where kind='orders' and data->>'trackingToken' is not null;
create index if not exists records_created on jastip.records(workspace_id,kind,created_at);
create table if not exists jastip.invitations (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references jastip.workspaces(id),email text not null,
 role text not null check(role in ('Manager','Helper')),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 accepted_at timestamptz,unique(workspace_id,email)
);
create table if not exists jastip.audit (
 id uuid primary key default gen_random_uuid(), workspace_id uuid references jastip.workspaces(id),actor uuid references auth.users(id),
 event text not null, created_at timestamptz not null default now()
);
create table if not exists jastip.rate_limits(bucket text primary key,count integer not null default 1,expires_at timestamptz not null);
-- Tables are private. All reads/writes go through explicit SECURITY DEFINER RPCs below.
alter table jastip.workspaces enable row level security;
alter table jastip.members enable row level security;
alter table jastip.records enable row level security;
alter table jastip.invitations enable row level security;
alter table jastip.audit enable row level security;
alter table jastip.platform_admins enable row level security;
alter table jastip.rate_limits enable row level security;
revoke all on schema jastip from public,anon,authenticated;
revoke all on all tables in schema jastip from public,anon,authenticated;

create or replace function jastip.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from jastip.platform_admins where user_id=auth.uid())$$;
create or replace function jastip.role_for(w uuid) returns text language sql stable security definer set search_path='' as $$select role from jastip.members where workspace_id=w and user_id=auth.uid()$$;
create or replace function jastip.limit_request(scope text,max_requests integer) returns void language plpgsql security definer set search_path='' as $$
declare v integer;begin
 insert into jastip.rate_limits(bucket,count,expires_at) values(scope,1,now()+interval '10 minutes')
 on conflict(bucket) do update set count=case when jastip.rate_limits.expires_at<now() then 1 else jastip.rate_limits.count+1 end,
 expires_at=case when jastip.rate_limits.expires_at<now() then now()+interval '10 minutes' else jastip.rate_limits.expires_at end returning count into v;
 if v>max_requests then raise exception 'Too many requests. Please try again later.';end if;
 delete from jastip.rate_limits where expires_at<now()-interval '1 day';end$$;
create or replace function public.jastip_create_workspace(p_name text,p_slug text) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid;begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email before creating a workspace.';end if;
 if exists(select 1 from jastip.members where user_id=auth.uid()) then raise exception 'You already belong to a workspace.';end if;
 insert into jastip.workspaces(name,slug) values(trim(p_name),lower(trim(p_slug))) returning id into w;
 insert into jastip.members values(w,auth.uid(),'Owner');
 insert into jastip.audit(workspace_id,actor,event) values(w,auth.uid(),'Workspace created.');return w;end$$;

create or replace function public.jastip_load_workspace(p_workspace uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text; result jsonb; k text;begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if p_workspace is null then select a.* into w from jastip.workspaces a join jastip.members m on m.workspace_id=a.id where m.user_id=auth.uid() order by a.created_at limit 1;
 else select * into w from jastip.workspaces where id=p_workspace;end if;
 if w.id is null then return null;end if;
 r:=jastip.role_for(w.id);
 if r is null and not jastip.is_admin() then raise exception 'Workspace access denied.';end if;
 if w.status in ('Suspended','Closed') and not jastip.is_admin() then raise exception 'Workspace is suspended or closed. Contact the platform owner.';end if;
 result:=jsonb_build_object('workspaceId',w.id,'revision',w.revision,'role',coalesce(r,'Support'),'isAdmin',jastip.is_admin(),'plan',w.plan,'subscriptionStatus',w.status,
 'shop',jsonb_build_object('name',w.name,'slug',w.slug,'bio',w.bio,'contact',w.contact),'preferences',jsonb_build_object('theme','light','accent','indigo','density','comfortable','motion','full'));
 foreach k in array array['items','orders','trips','budgets','customers','notes','invoices','reports'] loop
 result:=result||jsonb_build_object(k,coalesce((select jsonb_agg(case when r='Helper' and k='items' then data-array['cost','price','markup','allocation','rate','markupMode'] when r='Helper' and k='orders' then data-array['quotedCost','actualCost','allocation','fxRate','purchaseFxRate'] when r='Helper' and k in ('budgets','invoices') then '{}'::jsonb else data end order by created_at desc) from jastip.records where workspace_id=w.id and kind=k and (r is distinct from 'Helper' or k not in ('budgets','invoices'))),'[]'::jsonb));end loop;
 result:=result||jsonb_build_object('workspaceChoices',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'role',m.role)) from jastip.members m join jastip.workspaces a on a.id=m.workspace_id where m.user_id=auth.uid()),'[]'::jsonb));
 result:=result||jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'name',split_part(u.email,'@',1)),'email',u.email,'role',m.role,'status','Active')) from jastip.members m join auth.users u on u.id=m.user_id where m.workspace_id=w.id),'[]'::jsonb));
 result:=jsonb_set(result,'{members}',(result->'members')||coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'status','Invited')) from jastip.invitations i where i.workspace_id=w.id and i.accepted_at is null),'[]'::jsonb));
 result:=result||jsonb_build_object('audit',coalesce((select jsonb_agg(jsonb_build_object('id',id,'event',event,'actor',coalesce(actor::text,'Buyer'),'date',created_at,'merchant',w.name)) from (select * from jastip.audit where workspace_id=w.id order by created_at desc limit 100) a),'[]'::jsonb),'merchants','[]'::jsonb);
 return result;end$$;

create or replace function jastip.validate_record(w uuid,k text,v jsonb,old jsonb,r text) returns void language plpgsql security definer set search_path='' as $$
declare tr jsonb; n text; required text[]; allowed text[];pos integer;oldpos integer;paid numeric; total numeric;qty integer;begin
 if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid record.';end if;
 if v->>'id' is null or length(v->>'id')>100 then raise exception 'A valid record ID is required.';end if;
 required:=case k when 'items' then array['price','rate','cost','selling','markup','allocation','qty'] when 'trips' then array['rate','budget','actual','units'] when 'budgets' then array['planned','actual'] when 'orders' then array['total','paid','qty','quotedCost','allocation'] else array[]::text[] end;
 foreach n in array required loop if coalesce(v->>n,'') !~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' or (v->>n)::numeric>1000000000000 then raise exception 'Enter a finite, non-negative amount: %',n;end if;end loop;
 if k in ('items','trips') and coalesce(v->>'currency','') not in ('JPY','KRW','USD','SGD','IDR','THB','MYR','EUR') then raise exception 'Choose a supported currency.';end if;
 if k in ('items','orders','budgets') then
 select data into tr from jastip.records where workspace_id=w and kind='trips' and id=v->>'trip';
 if tr is null then raise exception 'Choose a trip in this workspace.';end if;
 if tr->>'status'='Closed' then raise exception 'Closed trips are read-only.';end if;end if;
 if r='Helper' then
 if k is distinct from 'orders' or old is null then raise exception 'Helpers can only update existing orders.';end if;
 if (v-array['status','paid','payments','proof','note']) is distinct from (old-array['status','paid','payments','proof','note']) then raise exception 'This order change requires a manager.';end if;end if;
 if k='trips' then
 if old->>'status'='Closed' and v is distinct from old then raise exception 'Closed trips are read-only.';end if;
 if v->>'status' is null or v->>'status' not in ('Planning','Open for orders','Shopping','Delivering','Closed') then raise exception 'Invalid trip status.';end if;
 if v->>'rate' is null or v->>'budget' is null or v->>'actual' is null or v->>'units' is null or (v->>'rate')::numeric<=0 or (v->>'budget')::numeric<0 or (v->>'actual')::numeric<0 or (v->>'units')::integer<0 then raise exception 'Invalid trip values.';end if;
 if (v->>'end')::date<(v->>'start')::date then raise exception 'Trip end must follow its start.';end if;
 elsif k='items' then
 if (v->>'cost')::numeric is distinct from round((v->>'price')::numeric*(v->>'rate')::numeric) then raise exception 'Product cost does not match its price and FX rate.';end if;
 if v->>'markupMode' not in ('percent','amount') or v->>'markupMode' is null then raise exception 'Choose a markup type.';end if;
 if (v->>'selling')::numeric is distinct from round(((v->>'cost')::numeric+case when v->>'markupMode'='percent' then round((v->>'cost')::numeric*(v->>'markup')::numeric/100) else (v->>'markup')::numeric end)/1000)*1000 then raise exception 'Selling price does not match its markup.';end if;
 if coalesce(length(trim(v->>'name')),0) not between 1 and 200 or v->>'status' is null or v->>'status' not in ('Available','Pre-order','Draft') then raise exception 'Invalid item name or availability.';end if;
 foreach n in array array['selling','cost','allocation','price','markup','qty'] loop if (v->>n)::numeric<0 or v->>n is null then raise exception 'Invalid item amount: %',n;end if;end loop;
 if (v->>'qty')::numeric<>trunc((v->>'qty')::numeric) or (v->>'rate')::numeric<=0 then raise exception 'Invalid quantity or FX rate.';end if;
 if jsonb_array_length(coalesce(v->'photos','[]'))>6 then raise exception 'Maximum six photos.';end if;
 elsif k='budgets' then
 if v->>'planned' is null or v->>'actual' is null or (v->>'planned')::numeric<0 or (v->>'actual')::numeric<0 then raise exception 'Expense amounts cannot be negative.';end if;
 elsif k='orders' then
 total:=(v->>'total')::numeric;paid:=(v->>'paid')::numeric;qty:=(v->>'qty')::integer;
 if qty is null or qty<1 or total is null or total<0 or paid is null or paid<0 or paid>total or coalesce(length(trim(v->>'name')),0) not between 1 and 120 or coalesce(v->>'phone','') !~ '^[+0-9 ()-]{8,20}$' then raise exception 'Invalid order details, amount or quantity.';end if;
 if v->>'status' is null or v->>'status' not in ('Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered','Cancelled') then raise exception 'Invalid order status.';end if;
 foreach n in array array['quotedCost','allocation'] loop if v->>n is null or (v->>n)::numeric<0 then raise exception 'Order pricing is required.';end if;end loop;
 if v->>'status' not in ('Requested','Cancelled') and total<=0 then raise exception 'Quote a positive order amount first.';end if;
 if old is not null then
 if v->'trackingToken' is distinct from old->'trackingToken' then raise exception 'Tracking tokens cannot be changed.';end if;
 if old->>'status' in ('Delivered','Cancelled') and v is distinct from old then raise exception 'This order is closed.';end if;
 if old->>'status' not in ('Requested','Quoted') and (v->'total',v->'quotedCost',v->'allocation',v->'fxRate',v->'qty',v->'itemId',v->'trip') is distinct from (old->'total',old->'quotedCost',old->'allocation',old->'fxRate',old->'qty',old->'itemId',old->'trip') then raise exception 'Confirmed order pricing is frozen.';end if;
 if jsonb_array_length(coalesce(v->'payments','[]'))<jsonb_array_length(coalesce(old->'payments','[]')) or exists(select 1 from jsonb_array_elements(coalesce(old->'payments','[]')) with ordinality as p(value,n) where v->'payments'->(p.n::int-1) is distinct from p.value) then raise exception 'The payment ledger is append-only.';end if;
 if paid<(old->>'paid')::numeric then raise exception 'Payments cannot be removed; record a refund note.';end if;
 allowed:=array['Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered'];pos:=array_position(allowed,v->>'status');oldpos:=array_position(allowed,old->>'status');
 if pos<oldpos then raise exception 'Orders cannot move backwards.';end if;
 if v->>'status'='Shipped' and old->>'status' not in ('Purchased','Shipped') then raise exception 'Purchase this order before shipping.';end if;
 if v->>'status'='Delivered' and old->>'status' not in ('Shipped','Delivered') then raise exception 'Ship this order before delivery.';end if;
 end if;
 if old is not null and coalesce(old->>'status','') in ('Purchased','Shipped','Delivered') and v->'actualCost' is distinct from old->'actualCost' then raise exception 'Purchase cost is frozen after purchasing.';end if;
 if v->>'status' in ('Paid','Purchased','Shipped','Delivered') and paid<>total then raise exception 'Record the full payment first.';end if;
 if v->>'status' in ('Purchased','Shipped','Delivered') and (v->>'actualCost' is null or (v->>'actualCost')::numeric<0) then raise exception 'Record an actual purchase cost first.';end if;
 if (select coalesce(sum((p->>'amount')::numeric),0) from jsonb_array_elements(coalesce(v->'payments','[]')) p)<>paid then raise exception 'Payment ledger must match amount paid.';end if;
 elsif k='customers' then
 if coalesce(length(trim(v->>'name')),0) not between 1 and 120 or coalesce(v->>'phone','') !~ '^[+0-9 ()-]{8,20}$' then raise exception 'Enter a customer name and valid WhatsApp number.';end if;
 elsif k='invoices' or k='reports' then raise exception 'Use platform billing or public report actions.';
 end if;end$$;

create or replace function public.jastip_commit(p_workspace uuid,p_revision bigint,p_changes jsonb,p_shop jsonb default null,p_event text default 'Workspace updated.') returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text;c jsonb;k text;v jsonb;old jsonb;i jsonb;maxitems integer;maxorders integer;begin
 select * into w from jastip.workspaces where id=p_workspace for update;r:=jastip.role_for(w.id);
 if r is null then raise exception 'Workspace write access denied.';end if;
 if w.status in ('Suspended','Closed','Past due') then raise exception 'This workspace cannot accept changes. Contact the platform owner.';end if;
 if w.status='Trial' and coalesce(w.trial_ends_at,now())<=now() then raise exception 'Your trial has ended. Contact the platform owner to activate a plan.';end if;
 if w.revision is distinct from p_revision then raise exception 'Another user changed this workspace. Refresh and try again.';end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>100 then raise exception 'Invalid change batch.';end if;
 if p_shop is not null then
 if r<>'Owner' then raise exception 'Only the owner can change workspace settings.';end if;
 if length(coalesce(p_shop->>'bio',''))>2000 or (coalesce(p_shop->>'contact','')<>'' and p_shop->>'contact' !~ '^[+0-9 ()-]{8,20}$') then raise exception 'Enter a short bio and valid WhatsApp contact.';end if;
 update jastip.workspaces set name=trim(p_shop->>'name'),slug=lower(p_shop->>'slug'),bio=coalesce(p_shop->>'bio',''),contact=coalesce(p_shop->>'contact','') where id=w.id;end if;
 for c in select * from jsonb_array_elements(p_changes) loop
 k:=c->>'kind';v:=c->'data';if k not in ('items','orders','trips','budgets','customers','notes') then raise exception 'Unsupported record type.';end if;
 select data into old from jastip.records where workspace_id=w.id and kind=k and id=v->>'id';
 if k='orders' and old is null then
 if v->>'itemId' is not null then
 select data into i from jastip.records where workspace_id=w.id and kind='items' and id=v->>'itemId';
 if i is null or i->>'status'='Draft' or (v->>'qty')::int>(i->>'qty')::int then raise exception 'Choose an available item and quantity.';end if;
 v:=v||jsonb_build_object('item',i->'name','trip',i->'trip','total',(i->>'selling')::numeric*(v->>'qty')::int,'quotedCost',i->'cost','allocation',i->'allocation','fxRate',i->'rate');
 update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((i->>'qty')::int-(v->>'qty')::int)),updated_at=now() where workspace_id=w.id and kind='items' and id=i->>'id';
 end if;
 v:=v||jsonb_build_object('trackingToken',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'createdAt',now(),'date',current_date);
 end if;
 -- Merge helper changes into full server payload; sensitive snapshots never leave the server.
 if r='Helper' then v:=coalesce(old,'{}')||v;end if;
 perform jastip.validate_record(w.id,k,v,old,r);
 if k='orders' and v->>'status'='Cancelled' and old->>'status' in ('Requested','Quoted','Confirmed','Paid') and old->>'itemId' is not null then update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((data->>'qty')::int+(old->>'qty')::int)),updated_at=now() where workspace_id=w.id and kind='items' and id=old->>'itemId';end if;
 insert into jastip.records(workspace_id,kind,id,data) values(w.id,k,v->>'id',v) on conflict(workspace_id,kind,id) do update set data=excluded.data,updated_at=now();end loop;
 maxitems:=case w.plan when 'Starter' then 50 when 'Pro' then 500 else 5000 end;
 maxorders:=case w.plan when 'Starter' then 100 when 'Pro' then 1000 else 100000 end;
 if w.plan='Starter' and (select count(*) from jastip.records where workspace_id=w.id and kind='trips' and data->>'status'<>'Closed')>2 then raise exception 'Starter supports two open trips. Request a plan upgrade.';end if;
 if (select count(*) from jastip.records where workspace_id=w.id and kind='items' and data->>'status'<>'Draft')>maxitems or (select count(*) from jastip.records where workspace_id=w.id and kind='orders' and created_at>=date_trunc('month',now()))>maxorders then raise exception 'Your plan limit has been reached.';end if;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,actor,event) values(w.id,auth.uid(),left(p_event,500));
 return public.jastip_load_workspace(w.id);end$$;

create or replace function public.jastip_storefront(p_slug text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;begin
 select * into w from jastip.workspaces where slug=lower(p_slug) and (status='Active' or (status='Trial' and trial_ends_at>now()));if w.id is null then raise exception 'Storefront not found or unavailable.';end if;
 return jsonb_build_object('shop',jsonb_build_object('name',w.name,'slug',w.slug,'bio',w.bio,'contact',w.contact),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.data->'name','category',a.data->'category','store',a.data->'store','trip',a.data->'trip','selling',a.data->'selling','qty',a.data->'qty','status',a.data->'status','note',a.data->'note','photos',a.data->'photos','deadline',a.data->'deadline')) from jastip.records a join jastip.records t on t.workspace_id=a.workspace_id and t.kind='trips' and t.id=a.data->>'trip' where a.workspace_id=w.id and a.kind='items' and a.data->>'status' in ('Available','Pre-order') and (a.data->>'qty')::int>0 and t.data->>'status'='Open for orders' and (nullif(a.data->>'deadline','') is null or (a.data->>'deadline')::date>=current_date)),'[]'::jsonb),
 'trips',coalesce((select jsonb_agg(data-array['budget','actual','rate','units','allocation']) from jastip.records where workspace_id=w.id and kind='trips' and data->>'status'='Open for orders'),'[]'::jsonb));end$$;

create or replace function public.jastip_place_order(p_slug text,p_order jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;i jsonb;t jsonb;o jsonb;code text;token text;qty integer;custom boolean;begin
 select * into w from jastip.workspaces where slug=lower(p_slug) and (status='Active' or (status='Trial' and trial_ends_at>now())) for update;if w.id is null then raise exception 'Storefront unavailable.';end if;
 if length(regexp_replace(coalesce(p_order->>'phone',''),'\D','','g')) not between 8 and 15 then raise exception 'Enter a WhatsApp number with its country code.';end if;
 if p_order->>'consent' is distinct from 'true' then raise exception 'Please consent to processing your order details.';end if;
 if coalesce(length(trim(p_order->>'name')),0) not between 1 and 120 or coalesce(p_order->>'phone','') !~ '^[+0-9 ()-]{8,20}$' or coalesce(length(trim(p_order->>'address')),0) not between 5 and 1000 then raise exception 'Enter your name, WhatsApp number and delivery address.';end if;
 perform jastip.limit_request(w.id::text||':'||regexp_replace(p_order->>'phone','\D','','g'),5);
 perform jastip.limit_request('store:'||w.id::text,100);
 if (select count(*) from jastip.records where workspace_id=w.id and kind='orders' and created_at>=date_trunc('month',now()))>=(case w.plan when 'Starter' then 100 when 'Pro' then 1000 else 100000 end) then raise exception 'This shop has reached its monthly order limit.';end if;
 qty:=(p_order->>'qty')::int;if qty is null or qty not between 1 and 1000 then raise exception 'Invalid quantity.';end if;
 if octet_length(coalesce(p_order->'photos','[]'::jsonb)::text)>400000 or jsonb_typeof(coalesce(p_order->'photos','[]')) is distinct from 'array' or jsonb_array_length(coalesce(p_order->'photos','[]'))>6 then raise exception 'Request photos are too large. Use a smaller image.';end if;
 custom:=coalesce(p_order->>'itemId','')='';
 if not custom then
 select data into i from jastip.records where workspace_id=w.id and kind='items' and id=p_order->>'itemId' for update;
 if i is null or i->>'status' not in ('Available','Pre-order') or (i->>'qty')::int<qty or (nullif(i->>'deadline','') is not null and (i->>'deadline')::date<current_date) then raise exception 'This item is no longer available in that quantity.';end if;
 if p_order->>'expectedPrice' is not null and (p_order->>'expectedPrice')::numeric is distinct from (i->>'selling')::numeric then raise exception 'The price changed. Refresh the storefront before ordering.';end if;
 select data into t from jastip.records where workspace_id=w.id and kind='trips' and id=i->>'trip';
 else select data into t from jastip.records where workspace_id=w.id and kind='trips' and id=p_order->>'trip';
 if coalesce(length(trim(p_order->>'item')),0) not between 1 and 200 or coalesce((p_order->>'budget')::numeric,0)<0 then raise exception 'Enter a valid request and budget.';end if;end if;
 if t is null or t->>'status'<>'Open for orders' then raise exception 'This trip is not accepting orders.';end if;
 code:='JO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 o:=jsonb_build_object('id',code,'trackingToken',token,'name',trim(p_order->>'name'),'phone',regexp_replace(p_order->>'phone','\D','','g'),'address',trim(p_order->>'address'),'qty',qty,'trip',t->>'id','itemId',case when custom then null else i->>'id' end,'item',case when custom then p_order->>'item' else i->>'name' end,
 'budget',case when custom then coalesce((p_order->>'budget')::numeric,0) else null end,'total',case when custom then 0 else (i->>'selling')::numeric*qty end,'paid',0,'status','Requested','source','Storefront','date',current_date,'createdAt',now(),'note',left(coalesce(p_order->>'note',''),1000),'link',left(coalesce(p_order->>'link',''),1000),'photos',coalesce(p_order->'photos','[]'::jsonb),'quotedCost',case when custom then 0 else (i->>'cost')::numeric end,'allocation',case when custom then 0 else (i->>'allocation')::numeric end,'fxRate',case when custom then null else i->'rate' end,'consentedAt',now());
 insert into jastip.records(workspace_id,kind,id,data) values(w.id,'orders',code,o);
 if not custom then update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((i->>'qty')::int-qty)),updated_at=now() where workspace_id=w.id and kind='items' and id=i->>'id';end if;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,event) values(w.id,'Buyer order '||code||' received.');
 return jsonb_build_object('id',code,'trackingToken',token,'status','Requested','total',o->'total');end$$;

create or replace function public.jastip_track_order(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o jsonb;begin
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Enter the private tracking token from your confirmation.';end if;
 select data into o from jastip.records where kind='orders' and data->>'trackingToken'=p_token;
 if o is null then raise exception 'Order not found. Check your tracking token.';end if;
 return jsonb_build_object('id',o->'id','status',o->'status','item',o->'item','qty',o->'qty');end$$;

create or replace function public.jastip_invite_member(p_workspace uuid,p_email text,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare i uuid;lim integer;begin
 if jastip.role_for(p_workspace)<>'Owner' or jastip.role_for(p_workspace) is null then raise exception 'Only the owner can invite members.';end if;
 if p_role not in ('Manager','Helper') or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email and role.';end if;
 select case plan when 'Starter' then 1 when 'Pro' then 3 else 10 end into lim from jastip.workspaces where id=p_workspace for update;
 if (select count(*) from jastip.members where workspace_id=p_workspace)+(select count(*) from jastip.invitations where workspace_id=p_workspace and accepted_at is null)>=lim then raise exception 'Team member limit reached. Request a plan upgrade.';end if;
 insert into jastip.invitations(workspace_id,email,role,created_by) values(p_workspace,lower(trim(p_email)),p_role,auth.uid()) returning id into i;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Invited '||lower(trim(p_email))||' as '||p_role||'.');return i;end$$;
create or replace function public.jastip_accept_invitation(p_invitation uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare i jastip.invitations;begin
 select * into i from jastip.invitations where id=p_invitation for update;
 if auth.uid() is null or i.id is null or i.accepted_at is not null or lower((select email from auth.users where id=auth.uid() and email_confirmed_at is not null)) is distinct from i.email then raise exception 'Sign in with the verified invited email address.';end if;
 insert into jastip.members values(i.workspace_id,auth.uid(),i.role);update jastip.invitations set accepted_at=now() where id=i.id;
 insert into jastip.audit(workspace_id,actor,event) values(i.workspace_id,auth.uid(),'Team invitation accepted.');return i.workspace_id;end$$;

create or replace function public.jastip_platform() returns jsonb language plpgsql security definer set search_path='' as $$
begin if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 return jsonb_build_object('merchants',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'slug',w.slug,'owner',coalesce(u.raw_user_meta_data->>'name',u.email),'email',u.email,'plan',w.plan,'status',w.status,'trialDays',greatest(0,ceil(extract(epoch from(coalesce(w.trial_ends_at,now())-now()))/86400)),'items',(select count(*) from jastip.records where workspace_id=w.id and kind='items'),'orders',(select count(*) from jastip.records where workspace_id=w.id and kind='orders'),'revenue',coalesce((select sum((data->>'amount')::numeric) from jastip.records where workspace_id=w.id and kind='invoices' and data->>'status'='Paid'),0))) from jastip.workspaces w left join jastip.members m on m.workspace_id=w.id and m.role='Owner' left join auth.users u on u.id=m.user_id),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'event',a.event,'actor',a.actor,'date',a.created_at,'merchant',w.name)) from (select * from jastip.audit order by created_at desc limit 100) a left join jastip.workspaces w on w.id=a.workspace_id),'[]'::jsonb),
 'planRequests',coalesce((select jsonb_agg(data||jsonb_build_object('merchant',workspace_id)) from jastip.records where kind='notes' and data->>'type'='plan-request' and coalesce(data->>'status','Open')='Open'),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(data||jsonb_build_object('merchant',workspace_id)) from jastip.records where kind='reports'),'[]'::jsonb));end$$;
create or replace function public.jastip_admin_action(p_workspace uuid,p_action text,p_value jsonb) returns void language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;v jsonb;begin
 if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 select * into w from jastip.workspaces where id=p_workspace for update;if w.id is null then raise exception 'Workspace not found.';end if;
 if p_action='plan' then update jastip.workspaces set plan=p_value->>'plan' where id=w.id;update jastip.records set data=jsonb_set(data,'{status}','"Resolved"'),updated_at=now() where workspace_id=w.id and kind='notes' and data->>'type'='plan-request' and data->>'plan'=p_value->>'plan';
 elsif p_action='status' then
 if p_value->>'status'='Suspended' and coalesce(length(trim(p_value->>'reason')),0)<5 then raise exception 'Give a suspension reason.';end if;
 update jastip.workspaces set status=p_value->>'status',trial_ends_at=case when p_value->>'status'='Trial' and trial_ends_at is null then now()+interval '14 days' else trial_ends_at end where id=w.id;
 elsif p_action='trial' then update jastip.workspaces set trial_ends_at=greatest(coalesce(trial_ends_at,now()),now())+interval '7 days' where id=w.id;
 elsif p_action='invoice' then
 if coalesce(p_value->>'amount','') !~ '^[0-9]+(\.[0-9]+)?$' or p_value->>'status' is null or (p_value->>'amount')::numeric>1000000000000 or (p_value->>'amount')::numeric<=0 or p_value->>'status' not in ('Paid','Unpaid','Refunded') then raise exception 'Invalid invoice.';end if;
 v:=p_value||jsonb_build_object('id','INV-'||gen_random_uuid(),'date',current_date);
 insert into jastip.records(workspace_id,kind,id,data) values(w.id,'invoices',v->>'id',v);
 elsif p_action='refund' then
 if coalesce(length(trim(p_value->>'note')),0)<5 then raise exception 'Give a refund reason.';end if;
 v:=p_value||jsonb_build_object('id',gen_random_uuid(),'type','refund','date',now());insert into jastip.records(workspace_id,kind,id,data) values(w.id,'notes',v->>'id',v);
 elsif p_action='support' then null;
 else raise exception 'Unsupported admin action.';end if;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,actor,event) values(w.id,auth.uid(),'Platform '||p_action||': '||left(p_value::text,400));end$$;
create or replace function public.jastip_report_store(p_slug text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;v jsonb;begin
 select id into w from jastip.workspaces where slug=lower(p_slug);if w is null or length(trim(p_note)) not between 10 and 2000 then raise exception 'Describe the issue in 10–2000 characters.';end if;
 perform jastip.limit_request('reports:'||w::text,10);v:=jsonb_build_object('id',gen_random_uuid(),'type','report','note',p_note,'status','Open','date',now());insert into jastip.records(workspace_id,kind,id,data) values(w,'reports',v->>'id',v);end$$;

revoke all on all functions in schema jastip from public,anon,authenticated;
revoke all on function public.jastip_create_workspace(text,text),public.jastip_load_workspace(uuid),public.jastip_commit(uuid,bigint,jsonb,jsonb,text),public.jastip_storefront(text),public.jastip_place_order(text,jsonb),public.jastip_track_order(text),public.jastip_invite_member(uuid,text,text),public.jastip_accept_invitation(uuid),public.jastip_platform(),public.jastip_admin_action(uuid,text,jsonb),public.jastip_report_store(text,text) from public,anon,authenticated;
grant execute on function public.jastip_create_workspace(text,text),public.jastip_load_workspace(uuid),public.jastip_commit(uuid,bigint,jsonb,jsonb,text),public.jastip_invite_member(uuid,text,text),public.jastip_accept_invitation(uuid),public.jastip_platform(),public.jastip_admin_action(uuid,text,jsonb) to authenticated;
grant execute on function public.jastip_storefront(text),public.jastip_place_order(text,jsonb),public.jastip_track_order(text),public.jastip_report_store(text,text) to anon,authenticated;
-- Storage buckets separate public product photos from private payment/expense proofs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jastip-products','jastip-products',true,2097152,array['image/jpeg','image/png','image/webp']),('jastip-proofs','jastip-proofs',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create or replace function public.jastip_can_upload(p_path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from jastip.members m join jastip.workspaces w on w.id=m.workspace_id where m.user_id=auth.uid() and m.workspace_id::text=split_part(p_path,'/',1) and m.role in ('Owner','Manager') and w.status in ('Active','Trial'))$$;
revoke all on function public.jastip_can_upload(text) from public;grant execute on function public.jastip_can_upload(text) to authenticated;
drop policy if exists jastip_upload_products on storage.objects;
create or replace function public.jastip_can_access_proof(p_path text,p_write boolean) returns boolean language sql stable security definer set search_path='' as $$select (not p_write and jastip.is_admin()) or exists(select 1 from jastip.members m join jastip.workspaces w on w.id=m.workspace_id where m.user_id=auth.uid() and m.workspace_id::text=split_part(p_path,'/',1) and (m.role in ('Owner','Manager') or (m.role='Helper' and split_part(p_path,'/',2)='orders')) and (not p_write or w.status in ('Active','Trial')))$$;
revoke all on function public.jastip_can_access_proof(text,boolean) from public;grant execute on function public.jastip_can_access_proof(text,boolean) to authenticated;
create policy jastip_upload_products on storage.objects for insert to authenticated with check(bucket_id='jastip-products' and public.jastip_can_upload(name));
drop policy if exists jastip_upload_proofs on storage.objects;
create policy jastip_upload_proofs on storage.objects for insert to authenticated with check(bucket_id='jastip-proofs' and public.jastip_can_access_proof(name,true));
drop policy if exists jastip_read_proofs on storage.objects;
create policy jastip_read_proofs on storage.objects for select to authenticated using(bucket_id='jastip-proofs' and public.jastip_can_access_proof(name,false));
notify pgrst,'reload schema';
create or replace function public.jastip_resolve_report(p_workspace uuid,p_report text) returns void language plpgsql security definer set search_path='' as $$
begin if not jastip.is_admin() then raise exception 'Platform access denied.';end if;
 update jastip.records set data=jsonb_set(data,'{status}','"Resolved"'),updated_at=now() where workspace_id=p_workspace and kind='reports' and id=p_report;
 if not found then raise exception 'Report not found.';end if;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Resolved report '||p_report||'.');end$$;
revoke all on function public.jastip_resolve_report(uuid,text) from public,anon;grant execute on function public.jastip_resolve_report(uuid,text) to authenticated;
notify pgrst,'reload schema';

create or replace function public.jastip_set_member_role(p_workspace uuid,p_member uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin if coalesce(jastip.role_for(p_workspace),'')<>'Owner' then raise exception 'Only the owner can assign roles.';end if;
 if p_role not in ('Manager','Helper') or p_role is null then raise exception 'Choose Manager or Helper.';end if;
 update jastip.members set role=p_role where workspace_id=p_workspace and user_id=p_member and role<>'Owner';
 if not found then update jastip.invitations set role=p_role where workspace_id=p_workspace and id=p_member and accepted_at is null;if not found then raise exception 'Member not found or owner role is protected.';end if;end if;
 update jastip.workspaces set revision=revision+1 where id=p_workspace;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Assigned '||p_role||' role to '||p_member||'.');end$$;
revoke all on function public.jastip_set_member_role(uuid,uuid,text) from public,anon;grant execute on function public.jastip_set_member_role(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
