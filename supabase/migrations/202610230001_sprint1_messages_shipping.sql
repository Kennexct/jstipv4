begin;
-- Additive migration (ADR-008): saved message templates per workspace, shipping with courier/resi,
-- and courier/resi on the public tracking page. No existing table or function body is rewritten
-- except jastip_track_order, which only gains fields.
create table if not exists jastip.workspace_settings (
 workspace_id uuid primary key references jastip.workspaces(id),
 messaging jsonb not null default '{}'::jsonb check(jsonb_typeof(messaging)='object' and octet_length(messaging::text)<20000),
 updated_at timestamptz not null default now()
);
alter table jastip.workspace_settings enable row level security;
revoke all on jastip.workspace_settings from public,anon,authenticated;

-- Any member reads the templates (Helpers send messages too).
create or replace function public.jastip_messaging(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if jastip.role_for(p_workspace) is null then raise exception 'Workspace access denied.';end if;
 return coalesce((select messaging from jastip.workspace_settings where workspace_id=p_workspace),'{}'::jsonb);end$$;

-- Owners and managers edit them. Only known keys are kept; everything is plain text.
create or replace function public.jastip_save_messaging(p_workspace uuid,p_value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.role_for(p_workspace);t jsonb:='{}'::jsonb;b jsonb;k text;v jsonb;begin
 if r is null then raise exception 'Workspace access denied.';end if;
 if r not in ('Owner','Manager') then raise exception 'Only owners and managers can change message templates.';end if;
 if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'Invalid message settings.';end if;
 foreach k in array array['quote','reminder','status','shipped'] loop
  if p_value->'templates' ? k then
   if jsonb_typeof(p_value->'templates'->k) is distinct from 'string' or length(p_value->'templates'->>k)>1000 then raise exception 'Templates can be up to 1,000 characters.';end if;
   t:=t||jsonb_build_object(k,p_value->'templates'->>k);end if;end loop;
 b:=coalesce(p_value->'bank','{}'::jsonb);
 if jsonb_typeof(b) is distinct from 'object' then raise exception 'Invalid bank details.';end if;
 if length(coalesce(b->>'bank',''))>40 or length(coalesce(b->>'holder',''))>80 then raise exception 'Bank name or account holder is too long.';end if;
 if coalesce(b->>'number','')<>'' and (b->>'number') !~ '^[0-9][0-9 -]{3,29}$' then raise exception 'Enter the account number using digits, spaces or dashes.';end if;
 v:=jsonb_build_object('templates',t,'bank',jsonb_build_object('bank',btrim(coalesce(b->>'bank','')),'number',btrim(coalesce(b->>'number','')),'holder',btrim(coalesce(b->>'holder',''))));
 insert into jastip.workspace_settings(workspace_id,messaging) values(p_workspace,v)
  on conflict(workspace_id) do update set messaging=excluded.messaging,updated_at=now();
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Message templates updated.');
 return v;end$$;

-- Ship orders with courier and resi. Any member (Helpers usually pack). Only status, courier,
-- resi and shippedAt change; every order still passes validate_record, so it must be purchased
-- and fully paid. Role 'Manager' is passed only to skip the Helper field lock, which is safe
-- because the new record is built from the stored one plus these four fields.
create or replace function public.jastip_ship_orders(p_workspace uuid,p_revision bigint,p_shipments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text;s jsonb;old jsonb;v jsonb;c text;n text;begin
 select * into w from jastip.workspaces where id=p_workspace for update;r:=jastip.role_for(w.id);
 if r is null then raise exception 'Workspace write access denied.';end if;
 if w.status in ('Suspended','Closed','Past due') then raise exception 'This workspace cannot accept changes. Contact the platform owner.';end if;
 if w.status='Trial' and coalesce(w.trial_ends_at,now())<=now() then raise exception 'Your trial has ended. Contact the platform owner to activate a plan.';end if;
 if w.revision is distinct from p_revision then raise exception 'Another user changed this workspace. Refresh and try again.';end if;
 if jsonb_typeof(p_shipments) is distinct from 'array' or jsonb_array_length(p_shipments) not between 1 and 100 then raise exception 'Choose between 1 and 100 orders to ship.';end if;
 for s in select * from jsonb_array_elements(p_shipments) loop
  c:=btrim(coalesce(s->>'courier',''));n:=upper(btrim(coalesce(s->>'resi','')));
  if c not in ('JNE','J&T','SiCepat','AnterAja','Ninja','POS','GoSend','GrabExpress','Pickup','Other') then raise exception 'Choose a courier.';end if;
  if c not in ('Pickup','GoSend','GrabExpress') and n='' then raise exception 'Enter the resi (tracking number) for %.',coalesce(s->>'id','this order');end if;
  if n<>'' and n !~ '^[A-Z0-9-]{4,40}$' then raise exception 'Resi can use letters, numbers and dashes (4–40 characters).';end if;
  select data into old from jastip.records where workspace_id=w.id and kind='orders' and id=s->>'id' for update;
  if old is null then raise exception 'Order % not found.',coalesce(s->>'id','');end if;
  v:=old||jsonb_build_object('status','Shipped','courier',c,'resi',n,'shippedAt',coalesce(old->>'shippedAt',now()::text));
  perform jastip.validate_record(w.id,'orders',v,old,'Manager');
  update jastip.records set data=v,updated_at=now() where workspace_id=w.id and kind='orders' and id=old->>'id';
 end loop;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,actor,event) values(w.id,auth.uid(),left(jsonb_array_length(p_shipments)||' order(s) shipped.',500));
 return public.jastip_load_workspace(w.id);end$$;

-- Public tracking: same lookup and privacy as before, plus courier, resi and ship date.
create or replace function public.jastip_track_order(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o jsonb;begin
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Enter the private tracking token from your confirmation.';end if;
 select data into o from jastip.records where kind='orders' and data->>'trackingToken'=p_token;
 if o is null then raise exception 'Order not found. Check your tracking token.';end if;
 return jsonb_build_object('id',o->'id','status',o->'status','item',o->'item','qty',o->'qty',
  'courier',o->'courier','resi',o->'resi','shippedAt',o->'shippedAt');end$$;

revoke all on function public.jastip_messaging(uuid),public.jastip_save_messaging(uuid,jsonb),public.jastip_ship_orders(uuid,bigint,jsonb),public.jastip_track_order(text) from public,anon,authenticated;
grant execute on function public.jastip_messaging(uuid),public.jastip_save_messaging(uuid,jsonb),public.jastip_ship_orders(uuid,bigint,jsonb) to authenticated;
grant execute on function public.jastip_track_order(text) to anon,authenticated;
commit;
