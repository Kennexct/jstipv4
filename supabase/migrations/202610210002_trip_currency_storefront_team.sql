begin;
-- 2026-10-21 · Currency per trip (ADR-003), storefront theme + team management (ADR-004).
-- Additive: one new column with a default, new helper functions, replaced function bodies. No data rewritten.
-- Apply after 202610210001_flexible_orders.sql in the Supabase SQL Editor. Safe to re-run.
alter table jastip.workspaces add column if not exists storefront jsonb not null default '{}'::jsonb;
do $$begin
 if not exists(select 1 from pg_constraint where conname='workspaces_storefront_object') then
  alter table jastip.workspaces add constraint workspaces_storefront_object check(jsonb_typeof(storefront)='object');
 end if;
end$$;
create or replace function jastip.currency_decimals(c text) returns integer language sql immutable set search_path='' as $$select case when coalesce(c,'IDR') in ('IDR','JPY','KRW') then 0 else 2 end$$;
create or replace function jastip.price_step(c text) returns numeric language sql immutable set search_path='' as $$select case coalesce(c,'IDR') when 'IDR' then 1000 when 'KRW' then 100 when 'JPY' then 10 else 1 end::numeric$$;
-- Down payments round to the item's selling-currency precision.
create or replace function jastip.deposit_for(item jsonb,total numeric,qty integer) returns numeric language sql immutable set search_path='' as $$
select case coalesce(item->>'depositMode','none')
 when 'percent' then least(total,round(total*coalesce(nullif(item->>'depositValue','')::numeric,0)/100,jastip.currency_decimals(item->>'baseCurrency')))
 when 'amount' then least(total,round(coalesce(nullif(item->>'depositValue','')::numeric,0)*qty,jastip.currency_decimals(item->>'baseCurrency')))
 else 0 end$$;
create or replace function jastip.validate_record(w uuid,k text,v jsonb,old jsonb,r text) returns void language plpgsql security definer set search_path='' as $$
declare tr jsonb; bc text; dec integer; step numeric; mk numeric; n text; required text[]; allowed text[];pos integer;oldpos integer;paid numeric; total numeric;qty integer;begin
 if jsonb_typeof(v) is distinct from 'object' then raise exception 'Invalid record.';end if;
 if v->>'id' is null or length(v->>'id')>100 then raise exception 'A valid record ID is required.';end if;
 required:=case k when 'items' then array['price','rate','cost','selling','markup','allocation','qty'] when 'trips' then array['rate','budget','actual','units'] when 'budgets' then array['planned','actual'] when 'orders' then array['total','paid','qty','quotedCost','allocation'] else array[]::text[] end;
 foreach n in array required loop if coalesce(v->>n,'') !~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' or (v->>n)::numeric>1000000000000 then raise exception 'Enter a finite, non-negative amount: %',n;end if;end loop;
 if k in ('items','trips') and coalesce(v->>'currency','') not in ('JPY','KRW','USD','SGD','IDR','THB','MYR','EUR') then raise exception 'Choose a supported currency.';end if;
 if k in ('items','orders','budgets') then
 select data into tr from jastip.records where workspace_id=w and kind='trips' and id=v->>'trip';
 if tr is null then raise exception 'Choose a trip in this workspace.';end if;
 if tr->>'status'='Closed' then raise exception 'Closed trips are read-only.';end if;
 bc:=coalesce(tr->>'baseCurrency','IDR');dec:=jastip.currency_decimals(bc);step:=jastip.price_step(bc);
 if coalesce(v->>'baseCurrency',bc)<>bc then raise exception 'This record must use the trip’s selling currency (%).',bc;end if;end if;
 if r='Helper' then
 if k is distinct from 'orders' or old is null then raise exception 'Helpers can only update existing orders.';end if;
 if (v-array['status','paid','payments','proof','note']) is distinct from (old-array['status','paid','payments','proof','note']) then raise exception 'This order change requires a manager.';end if;end if;
 if k='trips' then
 if old->>'status'='Closed' and v is distinct from old then raise exception 'Closed trips are read-only.';end if;
 if v->>'status' is null or v->>'status' not in ('Planning','Open for orders','Shopping','Delivering','Closed') then raise exception 'Invalid trip status.';end if;
 if v->>'rate' is null or v->>'budget' is null or v->>'actual' is null or v->>'units' is null or (v->>'rate')::numeric<=0 or (v->>'budget')::numeric<0 or (v->>'actual')::numeric<0 or (v->>'units')::integer<0 then raise exception 'Invalid trip values.';end if;
 if (v->>'end')::date<(v->>'start')::date then raise exception 'Trip end must follow its start.';end if;
 if coalesce(v->>'baseCurrency','IDR') not in ('JPY','KRW','USD','SGD','IDR','THB','MYR','EUR') then raise exception 'Choose a supported selling currency.';end if;
 if old is not null and coalesce(old->>'baseCurrency','IDR')<>coalesce(v->>'baseCurrency','IDR') and exists(select 1 from jastip.records where workspace_id=w and kind in ('items','orders','budgets') and data->>'trip'=v->>'id') then raise exception 'This trip already has items, orders or expenses, so its selling currency can’t change.';end if;
 elsif k='items' then
 if abs((v->>'cost')::numeric-round((v->>'price')::numeric*(v->>'rate')::numeric,dec))>power(10::numeric,-dec) then raise exception 'Product cost does not match its price and FX rate.';end if;
 if v->>'markupMode' not in ('percent','amount') or v->>'markupMode' is null then raise exception 'Choose a markup type.';end if;
 mk:=case when v->>'markupMode'='percent' then round((v->>'cost')::numeric*(v->>'markup')::numeric/100,dec) else (v->>'markup')::numeric end;
 if abs((v->>'selling')::numeric-round(((v->>'cost')::numeric+mk)/step)*step)>step then raise exception 'Selling price does not match its markup.';end if;
 if coalesce(length(trim(v->>'name')),0) not between 1 and 200 or v->>'status' is null or v->>'status' not in ('Available','Pre-order','Draft') then raise exception 'Invalid item name or availability.';end if;
 foreach n in array array['selling','cost','allocation','price','markup','qty'] loop if (v->>n)::numeric<0 or v->>n is null then raise exception 'Invalid item amount: %',n;end if;end loop;
 if (v->>'qty')::numeric<>trunc((v->>'qty')::numeric) or (v->>'rate')::numeric<=0 then raise exception 'Invalid quantity or FX rate.';end if;
 if jsonb_array_length(coalesce(v->'photos','[]'))>6 then raise exception 'Maximum six photos.';end if;
 if v ? 'unlimited' and jsonb_typeof(v->'unlimited') is distinct from 'boolean' then raise exception 'Invalid stock setting.';end if;
 if coalesce(v->>'depositMode','none') not in ('none','percent','amount') then raise exception 'Choose a down payment type.';end if;
 if coalesce(v->>'depositMode','none')<>'none' and (coalesce(v->>'depositValue','') !~ '^[0-9]+(\.[0-9]+)?$' or (v->>'depositValue')::numeric<=0 or (v->>'depositMode'='percent' and (v->>'depositValue')::numeric>100) or (v->>'depositValue')::numeric>1000000000000) then raise exception 'Enter a valid down payment.';end if;
 elsif k='budgets' then
 if v->>'planned' is null or v->>'actual' is null or (v->>'planned')::numeric<0 or (v->>'actual')::numeric<0 then raise exception 'Expense amounts cannot be negative.';end if;
 elsif k='orders' then
 total:=(v->>'total')::numeric;paid:=(v->>'paid')::numeric;qty:=(v->>'qty')::integer;
 if coalesce(v->>'currency',bc)<>bc then raise exception 'This order must use the trip’s selling currency (%).',bc;end if;
 if qty is null or qty<1 or total is null or total<0 or paid is null or paid<0 or paid>total or coalesce(length(trim(v->>'name')),0) not between 1 and 120 or coalesce(v->>'phone','') !~ '^[+0-9 ()-]{8,20}$' then raise exception 'Invalid order details, amount or quantity.';end if;
 if v->>'status' is null or v->>'status' not in ('Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered','Cancelled') then raise exception 'Invalid order status.';end if;
 foreach n in array array['quotedCost','allocation'] loop if v->>n is null or (v->>n)::numeric<0 then raise exception 'Order pricing is required.';end if;end loop;
 if v->>'status' not in ('Requested','Cancelled') and total<=0 then raise exception 'Quote a positive order amount first.';end if;
 if v ? 'deposit' and v->'deposit' <> 'null'::jsonb and (coalesce(v->>'deposit','') !~ '^[0-9]+(\.[0-9]+)?$' or (v->>'deposit')::numeric>total) then raise exception 'The down payment must be between zero and the order total.';end if;
 if old is not null then
 if v->'trackingToken' is distinct from old->'trackingToken' then raise exception 'Tracking tokens cannot be changed.';end if;
 if old->>'itemId' is not null and (v->'itemId',v->'qty') is distinct from (old->'itemId',old->'qty') then raise exception 'To change the item or quantity, cancel this order and create a new one.';end if;
 if old->>'status' in ('Delivered','Cancelled') and v is distinct from old then raise exception 'This order is closed.';end if;
 if old->>'status' not in ('Requested','Quoted') and (v->'total',v->'quotedCost',v->'allocation',v->'fxRate',v->'qty',v->'itemId',v->'trip',v->'deposit') is distinct from (old->'total',old->'quotedCost',old->'allocation',old->'fxRate',old->'qty',old->'itemId',old->'trip',old->'deposit') then raise exception 'Confirmed order pricing is frozen.';end if;
 if jsonb_array_length(coalesce(v->'payments','[]'))<jsonb_array_length(coalesce(old->'payments','[]')) or exists(select 1 from jsonb_array_elements(coalesce(old->'payments','[]')) with ordinality as p(value,n) where v->'payments'->(p.n::int-1) is distinct from p.value) then raise exception 'The payment ledger is append-only.';end if;
 if paid<(old->>'paid')::numeric then raise exception 'Payments cannot be removed; record a refund note.';end if;
 allowed:=array['Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered'];pos:=array_position(allowed,v->>'status');oldpos:=array_position(allowed,old->>'status');
 if pos<oldpos then raise exception 'Orders cannot move backwards.';end if;
 if v->>'status'='Shipped' and old->>'status' not in ('Purchased','Shipped') then raise exception 'Purchase this order before shipping.';end if;
 if v->>'status'='Delivered' and old->>'status' not in ('Shipped','Delivered') then raise exception 'Ship this order before delivery.';end if;
 end if;
 if old is not null and coalesce(old->>'status','') in ('Purchased','Shipped','Delivered') and v->'actualCost' is distinct from old->'actualCost' then raise exception 'Purchase cost is frozen after purchasing.';end if;
 -- Jastipers may buy before the customer pays: Purchased needs only the down payment; Paid/Shipped/Delivered need full payment.
 if v->>'status' in ('Paid','Shipped','Delivered') and paid<>total then raise exception 'Record the full payment before shipping.';end if;
 if v->>'status'='Purchased' and paid<coalesce(nullif(v->>'deposit','')::numeric,0) then raise exception 'Collect the down payment before purchasing.';end if;
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
 if p_shop ? 'storefront' and (jsonb_typeof(p_shop->'storefront') is distinct from 'object' or coalesce(p_shop->'storefront'->>'layout','marketplace') not in ('marketplace','showcase','lookbook') or coalesce(p_shop->'storefront'->>'accent','indigo') not in ('indigo','blue','teal','emerald','orange','red','rose','violet','brown','charcoal')) then raise exception 'Choose a storefront layout and colour from the list.';end if;
 update jastip.workspaces set name=trim(p_shop->>'name'),slug=lower(p_shop->>'slug'),bio=coalesce(p_shop->>'bio',''),contact=coalesce(p_shop->>'contact',''),storefront=case when p_shop ? 'storefront' then jsonb_build_object('layout',coalesce(p_shop->'storefront'->>'layout','marketplace'),'accent',coalesce(p_shop->'storefront'->>'accent','indigo')) else storefront end where id=w.id;end if;
 for c in select * from jsonb_array_elements(p_changes) loop
 k:=c->>'kind';v:=c->'data';if k not in ('items','orders','trips','budgets','customers','notes') then raise exception 'Unsupported record type.';end if;
 select data into old from jastip.records where workspace_id=w.id and kind=k and id=v->>'id';
 if k='orders' and old is null then
 if v->>'itemId' is not null then
 select data into i from jastip.records where workspace_id=w.id and kind='items' and id=v->>'itemId';
 if i is null or i->>'status'='Draft' or (v->>'qty')::int<1 or (not jastip.is_unlimited(i) and (v->>'qty')::int>(i->>'qty')::int) then raise exception 'Choose an available item and quantity.';end if;
 v:=v||jsonb_build_object('item',i->'name','trip',i->'trip','total',(i->>'selling')::numeric*(v->>'qty')::int,'quotedCost',i->'cost','allocation',i->'allocation','fxRate',i->'rate');
 v:=v||jsonb_build_object('deposit',jastip.deposit_for(i,(v->>'total')::numeric,(v->>'qty')::int),'currency',coalesce(i->>'baseCurrency','IDR'));
 if not jastip.is_unlimited(i) then update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((i->>'qty')::int-(v->>'qty')::int)),updated_at=now() where workspace_id=w.id and kind='items' and id=i->>'id';end if;
 end if;
 v:=v||jsonb_build_object('trackingToken',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'createdAt',now(),'date',current_date);
 end if;
 -- Merge helper changes into full server payload; sensitive snapshots never leave the server.
 if r='Helper' then v:=coalesce(old,'{}')||v;end if;
 perform jastip.validate_record(w.id,k,v,old,r);
 if k='orders' and v->>'status'='Cancelled' and old->>'status' in ('Requested','Quoted','Confirmed','Paid') and old->>'itemId' is not null then update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((data->>'qty')::int+(old->>'qty')::int)),updated_at=now() where workspace_id=w.id and kind='items' and id=old->>'itemId' and not jastip.is_unlimited(data);end if;
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
 return jsonb_build_object('shop',jsonb_build_object('name',w.name,'slug',w.slug,'bio',w.bio,'contact',w.contact,'storefront',w.storefront),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.data->'name','category',a.data->'category','store',a.data->'store','trip',a.data->'trip','selling',a.data->'selling','qty',a.data->'qty','status',a.data->'status','note',a.data->'note','photos',a.data->'photos','deadline',a.data->'deadline','unlimited',coalesce(a.data->'unlimited','false'::jsonb),'depositMode',coalesce(a.data->'depositMode','"none"'::jsonb),'depositValue',a.data->'depositValue','baseCurrency',coalesce(a.data->'baseCurrency','"IDR"'::jsonb))) from jastip.records a join jastip.records t on t.workspace_id=a.workspace_id and t.kind='trips' and t.id=a.data->>'trip' where a.workspace_id=w.id and a.kind='items' and a.data->>'status' in ('Available','Pre-order') and (jastip.is_unlimited(a.data) or (a.data->>'qty')::int>0) and t.data->>'status'='Open for orders' and (nullif(a.data->>'deadline','') is null or (a.data->>'deadline')::date>=current_date)),'[]'::jsonb),
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
 if i is null or i->>'status' not in ('Available','Pre-order') or (not jastip.is_unlimited(i) and (i->>'qty')::int<qty) or (nullif(i->>'deadline','') is not null and (i->>'deadline')::date<current_date) then raise exception 'This item is no longer available in that quantity.';end if;
 if jastip.is_unlimited(i) and qty>20 then raise exception 'You can order up to 20 of this item at a time.';end if;
 if p_order->>'expectedPrice' is not null and (p_order->>'expectedPrice')::numeric is distinct from (i->>'selling')::numeric then raise exception 'The price changed. Refresh the storefront before ordering.';end if;
 select data into t from jastip.records where workspace_id=w.id and kind='trips' and id=i->>'trip';
 else select data into t from jastip.records where workspace_id=w.id and kind='trips' and id=p_order->>'trip';
 if coalesce(length(trim(p_order->>'item')),0) not between 1 and 200 or coalesce((p_order->>'budget')::numeric,0)<0 then raise exception 'Enter a valid request and budget.';end if;end if;
 if t is null or t->>'status'<>'Open for orders' then raise exception 'This trip is not accepting orders.';end if;
 code:='JO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 o:=jsonb_build_object('id',code,'trackingToken',token,'name',trim(p_order->>'name'),'phone',regexp_replace(p_order->>'phone','\D','','g'),'address',trim(p_order->>'address'),'qty',qty,'trip',t->>'id','itemId',case when custom then null else i->>'id' end,'item',case when custom then p_order->>'item' else i->>'name' end,
 'budget',case when custom then coalesce((p_order->>'budget')::numeric,0) else null end,'total',case when custom then 0 else (i->>'selling')::numeric*qty end,'paid',0,'status','Requested','source','Storefront','date',current_date,'createdAt',now(),'note',left(coalesce(p_order->>'note',''),1000),'link',left(coalesce(p_order->>'link',''),1000),'photos',coalesce(p_order->'photos','[]'::jsonb),'quotedCost',case when custom then 0 else (i->>'cost')::numeric end,'allocation',case when custom then 0 else (i->>'allocation')::numeric end,'fxRate',case when custom then null else i->'rate' end,'consentedAt',now(),'currency',coalesce(case when custom then t->>'baseCurrency' else i->>'baseCurrency' end,'IDR'),'deposit',case when custom then 0 else jastip.deposit_for(i,(i->>'selling')::numeric*qty,qty) end);
 insert into jastip.records(workspace_id,kind,id,data) values(w.id,'orders',code,o);
 if not custom and not jastip.is_unlimited(i) then update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((i->>'qty')::int-qty)),updated_at=now() where workspace_id=w.id and kind='items' and id=i->>'id';end if;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,event) values(w.id,'Buyer order '||code||' received.');
 return jsonb_build_object('id',code,'trackingToken',token,'status','Requested','total',o->'total','deposit',o->'deposit','currency',o->'currency');end$$;

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
 'shop',jsonb_build_object('name',w.name,'slug',w.slug,'bio',w.bio,'contact',w.contact,'storefront',w.storefront),'preferences',jsonb_build_object('theme','light','accent','indigo','density','comfortable','motion','full'));
 foreach k in array array['items','orders','trips','budgets','customers','notes','invoices','reports'] loop
 result:=result||jsonb_build_object(k,coalesce((select jsonb_agg(case when r='Helper' and k='items' then data-array['cost','price','markup','allocation','rate','markupMode'] when r='Helper' and k='orders' then data-array['quotedCost','actualCost','allocation','fxRate','purchaseFxRate'] when r='Helper' and k in ('budgets','invoices') then '{}'::jsonb else data end order by created_at desc) from jastip.records where workspace_id=w.id and kind=k and (r is distinct from 'Helper' or k not in ('budgets','invoices'))),'[]'::jsonb));end loop;
 result:=result||jsonb_build_object('workspaceChoices',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'role',m.role)) from jastip.members m join jastip.workspaces a on a.id=m.workspace_id where m.user_id=auth.uid()),'[]'::jsonb));
 result:=result||jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'name',split_part(u.email,'@',1)),'email',u.email,'role',m.role,'status','Active')) from jastip.members m join auth.users u on u.id=m.user_id where m.workspace_id=w.id),'[]'::jsonb));
 result:=jsonb_set(result,'{members}',(result->'members')||coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'status','Invited')) from jastip.invitations i where i.workspace_id=w.id and i.accepted_at is null),'[]'::jsonb));
 result:=result||jsonb_build_object('audit',coalesce((select jsonb_agg(jsonb_build_object('id',id,'event',event,'actor',coalesce(actor::text,'Buyer'),'date',created_at,'merchant',w.name)) from (select * from jastip.audit where workspace_id=w.id order by created_at desc limit 100) a),'[]'::jsonb),'merchants','[]'::jsonb);
 return result;end$$;
create or replace function public.jastip_remove_member(p_workspace uuid,p_member uuid) returns void language plpgsql security definer set search_path='' as $$
declare who text;begin
 if coalesce(jastip.role_for(p_workspace),'')<>'Owner' then raise exception 'Only the owner can remove team members.';end if;
 if p_member=auth.uid() then raise exception 'The owner can’t be removed.';end if;
 delete from jastip.members where workspace_id=p_workspace and user_id=p_member and role<>'Owner' returning 'member' into who;
 if who is null then
  delete from jastip.invitations where workspace_id=p_workspace and id=p_member and accepted_at is null returning 'invitation' into who;
 end if;
 if who is null then raise exception 'Member not found, or the owner role is protected.';end if;
 update jastip.workspaces set revision=revision+1 where id=p_workspace;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),case when who='member' then 'Removed a team member.' else 'Cancelled a pending invitation.' end);end$$;
create or replace function public.jastip_update_invitation(p_workspace uuid,p_invitation uuid,p_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare e text:=lower(trim(p_email));begin
 if coalesce(jastip.role_for(p_workspace),'')<>'Owner' then raise exception 'Only the owner can edit invitations.';end if;
 if e !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then raise exception 'Enter a valid email address.';end if;
 if exists(select 1 from jastip.invitations where workspace_id=p_workspace and email=e and id<>p_invitation) then raise exception 'That email already has an invitation.';end if;
 if exists(select 1 from jastip.members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace and lower(u.email)=e) then raise exception 'That person is already a member.';end if;
 update jastip.invitations set email=e,created_at=now() where workspace_id=p_workspace and id=p_invitation and accepted_at is null;
 if not found then raise exception 'Only pending invitations can be edited.';end if;
 update jastip.workspaces set revision=revision+1 where id=p_workspace;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Changed a pending invitation to '||e||'.');return p_invitation;end$$;

revoke all on all functions in schema jastip from public,anon,authenticated;
revoke all on function public.jastip_commit(uuid,bigint,jsonb,jsonb,text),public.jastip_storefront(text),public.jastip_place_order(text,jsonb),public.jastip_load_workspace(uuid),public.jastip_remove_member(uuid,uuid),public.jastip_update_invitation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.jastip_commit(uuid,bigint,jsonb,jsonb,text),public.jastip_load_workspace(uuid),public.jastip_remove_member(uuid,uuid),public.jastip_update_invitation(uuid,uuid,text) to authenticated;
grant execute on function public.jastip_storefront(text),public.jastip_place_order(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
