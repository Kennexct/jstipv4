begin;
-- Additive migration (ADR-010): editable couriers and region settings (international launch),
-- partial "return credit", and validate_record v4. Run after 202610240001.
alter table jastip.workspace_settings add column if not exists couriers jsonb check(couriers is null or jsonb_typeof(couriers)='array');
alter table jastip.workspace_settings add column if not exists region jsonb check(region is null or jsonb_typeof(region)='object');

create or replace function jastip.validate_record(w uuid,k text,v jsonb,old jsonb,r text) returns void language plpgsql security definer set search_path='' as $$
declare tr jsonb; bc text; dec integer; step numeric; mk numeric; n text; required text[]; allowed text[];pos integer;oldpos integer;paid numeric; total numeric;qty integer;rcv integer;fee numeric;led boolean:=coalesce(current_setting('jastip.ledger',true),'')='on';sub boolean:=coalesce(current_setting('jastip.substitute',true),'')='on';e jsonb;begin
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
 -- ADR-009: ongkir is separate from the frozen item total. Payment rules use net paid (payments minus refunds/credits).
 if v ? 'shippingFee' and v->'shippingFee'<>'null'::jsonb and (coalesce(v->>'shippingFee','') !~ '^[0-9]+(\.[0-9]+)?$' or (v->>'shippingFee')::numeric>1000000000000) then raise exception 'Enter a valid ongkir amount.';end if;
 fee:=coalesce(nullif(v->>'shippingFee','')::numeric,0);
 -- A refund or credit added to a delivered order is post-delivery compensation: it doesn't reopen the order.
 rcv:=case when led and old->>'status'='Delivered' and v-array['paid','payments']=old-array['paid','payments'] then 1 else 0 end;
 -- New ledger lines: plain payments must be positive; refund/credit/credit-use only through the ledger RPCs.
 for e in select value from jsonb_array_elements(coalesce(v->'payments','[]')) with ordinality as x(value,n) where x.n>coalesce(jsonb_array_length(old->'payments'),0) loop
  if coalesce(e->>'amount','') !~ '^-?[0-9]+(\.[0-9]+)?$' or (e->>'amount')::numeric=0 then raise exception 'Enter a valid payment amount.';end if;
  if e ? 'type' and e->'type'<>'null'::jsonb then
   if not led then raise exception 'Refunds and credits must be recorded from the order actions.';end if;
   if e->>'type' not in ('refund','credit','credit-use','credit-return') or (e->>'type' in ('refund','credit','credit-return') and (e->>'amount')::numeric>0) or (e->>'type'='credit-use' and (e->>'amount')::numeric<0) then raise exception 'Invalid ledger entry.';end if;
  elsif (e->>'amount')::numeric<0 then raise exception 'Payments must be positive. Record a refund from the order actions.';end if;
 end loop;
 if coalesce(v->>'currency',bc)<>bc then raise exception 'This order must use the trip’s selling currency (%).',bc;end if;
 if qty is null or qty<1 or total is null or total<0 or paid is null or paid<0 or paid>total+fee or coalesce(length(trim(v->>'name')),0) not between 1 and 120 or coalesce(v->>'phone','') !~ '^[+0-9 ()-]{8,20}$' then raise exception 'Invalid order details, amount or quantity.';end if;
 if v->>'status' is null or v->>'status' not in ('Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered','Cancelled') then raise exception 'Invalid order status.';end if;
 foreach n in array array['quotedCost','allocation'] loop if v->>n is null or (v->>n)::numeric<0 then raise exception 'Order pricing is required.';end if;end loop;
 if v->>'status' not in ('Requested','Cancelled') and total<=0 then raise exception 'Quote a positive order amount first.';end if;
 if v ? 'deposit' and v->'deposit' <> 'null'::jsonb and (coalesce(v->>'deposit','') !~ '^[0-9]+(\.[0-9]+)?$' or (v->>'deposit')::numeric>total) then raise exception 'The down payment must be between zero and the order total.';end if;
 if old is not null then
 if v->'trackingToken' is distinct from old->'trackingToken' then raise exception 'Tracking tokens cannot be changed.';end if;
 if not sub and old->>'itemId' is not null and (v->'itemId',v->'qty') is distinct from (old->'itemId',old->'qty') then raise exception 'To change the item or quantity, cancel this order and create a new one.';end if;
 if old->>'status' in ('Delivered','Cancelled') and v is distinct from old and not (led and old->>'status'='Delivered' and v-array['paid','payments']=old-array['paid','payments']) then raise exception 'This order is closed.';end if;
 if not sub and old->>'status' not in ('Requested','Quoted') and (v->'total',v->'quotedCost',v->'allocation',v->'fxRate',v->'qty',v->'itemId',v->'trip',v->'deposit') is distinct from (old->'total',old->'quotedCost',old->'allocation',old->'fxRate',old->'qty',old->'itemId',old->'trip',old->'deposit') then raise exception 'Confirmed order pricing is frozen.';end if;
 if jsonb_array_length(coalesce(v->'payments','[]'))<jsonb_array_length(coalesce(old->'payments','[]')) or exists(select 1 from jsonb_array_elements(coalesce(old->'payments','[]')) with ordinality as p(value,n) where v->'payments'->(p.n::int-1) is distinct from p.value) then raise exception 'The payment ledger is append-only.';end if;
 if not led and paid<(old->>'paid')::numeric then raise exception 'Payments cannot be removed; record a refund note.';end if;
 allowed:=array['Requested','Quoted','Confirmed','Paid','Purchased','Shipped','Delivered'];pos:=array_position(allowed,v->>'status');oldpos:=array_position(allowed,old->>'status');
 if pos<oldpos and not ((sub or led) and old->>'status'='Paid' and v->>'status'='Confirmed') then raise exception 'Orders cannot move backwards.';end if;
 if old->>'status' in ('Shipped','Delivered') and coalesce(v->'shippingFee','null'::jsonb) is distinct from coalesce(old->'shippingFee','null'::jsonb) then raise exception 'Ongkir is fixed once the order ships.';end if;
 if v->>'status'='Shipped' and old->>'status' not in ('Purchased','Shipped') then raise exception 'Purchase this order before shipping.';end if;
 if v->>'status'='Delivered' and old->>'status' not in ('Shipped','Delivered') then raise exception 'Ship this order before delivery.';end if;
 end if;
 if old is not null and coalesce(old->>'status','') in ('Purchased','Shipped','Delivered') and v->'actualCost' is distinct from old->'actualCost' then raise exception 'Purchase cost is frozen after purchasing.';end if;
 -- Jastipers may buy before the customer pays: Purchased needs only the down payment; Paid/Shipped/Delivered need full payment.
 if rcv=0 and v->>'status'='Paid' and (paid<total or paid>total+fee) then raise exception 'Record the full payment before marking this order paid.';end if;
 if rcv=0 and v->>'status' in ('Shipped','Delivered') and paid<>total+fee then raise exception 'Record the full payment before shipping, including ongkir.';end if;
 if v->>'status'='Purchased' and paid<coalesce(nullif(v->>'deposit','')::numeric,0) then raise exception 'Collect the down payment before purchasing.';end if;
 if v->>'status' in ('Purchased','Shipped','Delivered') and (v->>'actualCost' is null or (v->>'actualCost')::numeric<0) then raise exception 'Record an actual purchase cost first.';end if;
 if (select coalesce(sum((p->>'amount')::numeric),0) from jsonb_array_elements(coalesce(v->'payments','[]')) p)<>paid then raise exception 'Payment ledger must match amount paid.';end if;
 elsif k='customers' then
 if coalesce(length(trim(v->>'name')),0) not between 1 and 120 or coalesce(v->>'phone','') !~ '^[+0-9 ()-]{8,20}$' then raise exception 'Enter a customer name and valid WhatsApp number.';end if;
 elsif k='invoices' or k='reports' then raise exception 'Use platform billing or public report actions.';
 end if;end$$;

-- Region: country, calling code and template language. Indonesia is the default for existing workspaces.
create or replace function jastip.region_of(w uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('country','ID','callingCode','62','language','id')||coalesce((select region from jastip.workspace_settings where workspace_id=w),'{}'::jsonb)$$;
create or replace function jastip.default_couriers(country text) returns jsonb language sql immutable set search_path='' as $$
 select case when country='ID' then
  '[{"name":"JNE","tracking":true},{"name":"J&T","tracking":true},{"name":"SiCepat","tracking":true},{"name":"AnterAja","tracking":true},{"name":"Ninja Xpress","tracking":true},{"name":"POS Indonesia","tracking":true},{"name":"GoSend","tracking":false},{"name":"GrabExpress","tracking":false},{"name":"Pickup","tracking":false},{"name":"Other","tracking":true}]'::jsonb
 else '[{"name":"Local courier","tracking":true},{"name":"Post","tracking":true},{"name":"Pickup","tracking":false},{"name":"Other","tracking":true}]'::jsonb end$$;
create or replace function jastip.couriers_of(w uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select couriers from jastip.workspace_settings where workspace_id=w),jastip.default_couriers(jastip.region_of(w)->>'country'))$$;

-- Phone keys: digits only, with a leading 0 replaced by the workspace calling code. The code is set
-- per transaction by the RPCs below (default 62, which keeps existing Indonesian keys valid).
create or replace function jastip.phone_key(p text) returns text language sql stable set search_path='' as $$
 select regexp_replace(regexp_replace(coalesce(p,''),'\D','','g'),'^0',coalesce(nullif(current_setting('jastip.calling_code',true),''),'62'))$$;
create or replace function jastip.use_region(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform set_config('jastip.calling_code',jastip.region_of(w)->>'callingCode',true);end$$;
create or replace function jastip.credit_balance(w uuid,p text) returns numeric language plpgsql security definer set search_path='' as $$
begin perform jastip.use_region(w);
 return coalesce((select sum(amount) from jastip.buyer_credits where workspace_id=w and phone=jastip.phone_key(p)),0);end$$;
create or replace function jastip.order_write_begin(p_workspace uuid,p_revision bigint,p_roles text[]) returns text language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text;begin
 select * into w from jastip.workspaces where id=p_workspace for update;r:=jastip.role_for(w.id);
 if r is null then raise exception 'Workspace write access denied.';end if;
 if not (r=any(p_roles)) then raise exception 'Only owners and managers can do this.';end if;
 if w.status in ('Suspended','Closed','Past due') then raise exception 'This workspace cannot accept changes. Contact the platform owner.';end if;
 if w.status='Trial' and coalesce(w.trial_ends_at,now())<=now() then raise exception 'Your trial has ended. Contact the platform owner to activate a plan.';end if;
 if w.revision is distinct from p_revision then raise exception 'Another user changed this workspace. Refresh and try again.';end if;
 perform jastip.use_region(w.id);
 return r;end$$;

-- Settings for members: messages, couriers and region in one call.
create or replace function public.jastip_settings(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if jastip.role_for(p_workspace) is null then raise exception 'Workspace access denied.';end if;
 return jsonb_build_object('messaging',coalesce((select messaging from jastip.workspace_settings where workspace_id=p_workspace),'{}'::jsonb),
  'couriers',jastip.couriers_of(p_workspace),'customCouriers',(select couriers is not null from jastip.workspace_settings where workspace_id=p_workspace),
  'region',jastip.region_of(p_workspace),
  'hasCredits',exists(select 1 from jastip.buyer_credits where workspace_id=p_workspace));end$$;

-- Owners and managers save couriers and/or region. Keys left out stay as they are.
create or replace function public.jastip_save_settings(p_workspace uuid,p_value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.role_for(p_workspace);c jsonb;g jsonb;e jsonb;names text[]:='{}';n text;begin
 if r is null then raise exception 'Workspace access denied.';end if;
 if r not in ('Owner','Manager') then raise exception 'Only owners and managers can change shipping and region settings.';end if;
 if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'Invalid settings.';end if;
 insert into jastip.workspace_settings(workspace_id) values(p_workspace) on conflict do nothing;
 if p_value ? 'couriers' then
  c:=p_value->'couriers';
  if jsonb_typeof(c) is distinct from 'array' or jsonb_array_length(c) not between 1 and 30 then raise exception 'Keep between 1 and 30 couriers.';end if;
  for e in select value from jsonb_array_elements(c) loop
   n:=btrim(coalesce(e->>'name',''));
   if length(n) not between 1 and 40 or n ~ '[<>]' then raise exception 'Courier names need 1–40 characters.';end if;
   if lower(n)=any(names) then raise exception 'Courier "%" is listed twice.',n;end if;
   names:=names||lower(n);
  end loop;
  update jastip.workspace_settings set couriers=(select jsonb_agg(jsonb_build_object('name',btrim(x->>'name'),'tracking',coalesce((x->>'tracking')::boolean,true))) from jsonb_array_elements(c) x),updated_at=now() where workspace_id=p_workspace;
 end if;
 if p_value ? 'region' then
  g:=jastip.region_of(p_workspace)||(p_value->'region');
  if coalesce(g->>'country','') !~ '^[A-Z]{2}$' then raise exception 'Choose a country.';end if;
  if coalesce(g->>'callingCode','') !~ '^[0-9]{1,4}$' then raise exception 'Enter the country calling code, for example 62 or 65.';end if;
  if g->>'language' not in ('id','en') then raise exception 'Choose a message language.';end if;
  if g->>'callingCode'<>jastip.region_of(p_workspace)->>'callingCode' and exists(select 1 from jastip.buyer_credits where workspace_id=p_workspace) then
   raise exception 'The calling code can’t change after buyers have credit, because their balances are saved under it.';end if;
  update jastip.workspace_settings set region=jsonb_build_object('country',g->>'country','callingCode',g->>'callingCode','language',g->>'language'),updated_at=now() where workspace_id=p_workspace;
 end if;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),'Shipping and region settings updated.');
 return public.jastip_settings(p_workspace);end$$;

-- Ship v2: any saved courier (or a new name, which is added to the list). Resi is required unless
-- the courier is saved without tracking numbers.
create or replace function public.jastip_ship_orders(p_workspace uuid,p_revision bigint,p_shipments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text;s jsonb;old jsonb;v jsonb;c text;n text;list jsonb;known jsonb;begin
 select * into w from jastip.workspaces where id=p_workspace for update;r:=jastip.role_for(w.id);
 if r is null then raise exception 'Workspace write access denied.';end if;
 if w.status in ('Suspended','Closed','Past due') then raise exception 'This workspace cannot accept changes. Contact the platform owner.';end if;
 if w.status='Trial' and coalesce(w.trial_ends_at,now())<=now() then raise exception 'Your trial has ended. Contact the platform owner to activate a plan.';end if;
 if w.revision is distinct from p_revision then raise exception 'Another user changed this workspace. Refresh and try again.';end if;
 if jsonb_typeof(p_shipments) is distinct from 'array' or jsonb_array_length(p_shipments) not between 1 and 100 then raise exception 'Choose between 1 and 100 orders to ship.';end if;
 list:=jastip.couriers_of(w.id);
 for s in select * from jsonb_array_elements(p_shipments) loop
  c:=btrim(coalesce(s->>'courier',''));n:=upper(btrim(coalesce(s->>'resi','')));
  if length(c) not between 1 and 40 or c ~ '[<>]' then raise exception 'Choose a courier.';end if;
  select x into known from jsonb_array_elements(list) x where lower(x->>'name')=lower(c) limit 1;
  if known is not null then c:=known->>'name';end if;
  if coalesce((known->>'tracking')::boolean,(s->>'tracking')::boolean,true) and n='' then raise exception 'Enter the tracking number for %.',coalesce(s->>'id','this order');end if;
  if n<>'' and n !~ '^[A-Z0-9-]{4,40}$' then raise exception 'Tracking numbers can use letters, numbers and dashes (4–40 characters).';end if;
  if known is null then
   if jsonb_array_length(list)>=30 then raise exception 'Your courier list is full. Remove one in Settings first.';end if;
   list:=list||jsonb_build_array(jsonb_build_object('name',c,'tracking',coalesce((s->>'tracking')::boolean,true)));
   insert into jastip.workspace_settings(workspace_id,couriers) values(w.id,list) on conflict(workspace_id) do update set couriers=excluded.couriers,updated_at=now();
  end if;
  select data into old from jastip.records where workspace_id=w.id and kind='orders' and id=s->>'id' for update;
  if old is null then raise exception 'Order % not found.',coalesce(s->>'id','');end if;
  v:=old||jsonb_build_object('status','Shipped','courier',c,'resi',n,'shippedAt',coalesce(old->>'shippedAt',now()::text));
  perform jastip.validate_record(w.id,'orders',v,old,'Manager');
  update jastip.records set data=v,updated_at=now() where workspace_id=w.id and kind='orders' and id=old->>'id';
  known:=null;
 end loop;
 update jastip.workspaces set revision=revision+1 where id=w.id;
 insert into jastip.audit(workspace_id,actor,event) values(w.id,auth.uid(),left(jsonb_array_length(p_shipments)||' order(s) shipped.',500));
 return public.jastip_load_workspace(w.id);end$$;

-- Return credit (Kenny: an amount, not all-or-nothing). Puts credit used on this order back on the
-- buyer's balance; the order then needs that much paid another way.
create or replace function public.jastip_return_credit(p_workspace uuid,p_revision bigint,p_order_id text,p_amount numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.order_write_begin(p_workspace,p_revision,array['Owner','Manager','Helper']);old jsonb:=jastip.locked_order(p_workspace,p_order_id);v jsonb;used numeric;paid numeric;begin
 if old->>'status' in ('Shipped','Delivered','Cancelled') then raise exception 'Credit can only be returned before the order ships.';end if;
 select coalesce(sum(case when p->>'type'='credit-use' then (p->>'amount')::numeric when p->>'type'='credit-return' then (p->>'amount')::numeric else 0 end),0)
  into used from jsonb_array_elements(coalesce(old->'payments','[]'::jsonb)) p;
 if p_amount is null or p_amount<=0 then raise exception 'Enter how much credit to return.';end if;
 if p_amount>used then raise exception 'Only % of credit was used on this order.',used;end if;
 paid:=coalesce((old->>'paid')::numeric,0);
 v:=old||jsonb_build_object('paid',paid-p_amount,'payments',coalesce(old->'payments','[]'::jsonb)||jsonb_build_array(jastip.ledger_line(-p_amount,'credit-return','')||'{"method":"Credit returned"}'::jsonb));
 if old->>'status'='Paid' and paid-p_amount<(old->>'total')::numeric then v:=v||'{"status":"Confirmed"}';end if;
 perform set_config('jastip.ledger','on',true);
 perform jastip.validate_record(p_workspace,'orders',v,old,r);
 perform jastip.save_order(p_workspace,v);
 insert into jastip.buyer_credits(workspace_id,phone,amount,kind,order_id,note,created_by) values(p_workspace,jastip.phone_key(old->>'phone'),p_amount,'issue',old->>'id','Returned from '||(old->>'id'),auth.uid());
 return jastip.order_write_end(p_workspace,'Credit of '||p_amount||' returned from '||(old->>'id')||'.');end$$;

-- Balances use the workspace calling code too.
create or replace function public.jastip_buyer_credits(p_workspace uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if jastip.role_for(p_workspace) is null then raise exception 'Workspace access denied.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('phone',phone,'balance',bal)) from (select phone,sum(amount) bal from jastip.buyer_credits where workspace_id=p_workspace group by phone having sum(amount)<>0) s),'[]'::jsonb);end$$;

revoke all on function jastip.validate_record(uuid,text,jsonb,jsonb,text),jastip.region_of(uuid),jastip.default_couriers(text),jastip.couriers_of(uuid),jastip.phone_key(text),jastip.use_region(uuid),
 jastip.credit_balance(uuid,text),jastip.order_write_begin(uuid,bigint,text[]) from public,anon,authenticated;
revoke all on function public.jastip_settings(uuid),public.jastip_save_settings(uuid,jsonb),public.jastip_ship_orders(uuid,bigint,jsonb),public.jastip_return_credit(uuid,bigint,text,numeric),public.jastip_buyer_credits(uuid) from public,anon,authenticated;
grant execute on function public.jastip_settings(uuid),public.jastip_save_settings(uuid,jsonb),public.jastip_ship_orders(uuid,bigint,jsonb),public.jastip_return_credit(uuid,bigint,text,numeric),public.jastip_buyer_credits(uuid) to authenticated;
commit;
