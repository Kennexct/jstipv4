begin;
-- Additive migration (ADR-009): buyer credits, refunds/credits on the existing payment ledger,
-- out-of-stock cancellation, substitution on the same order, and ongkir (shippingFee).
-- Exceptions to the money rules exist only inside the RPCs below, which set a transaction-local
-- flag that validate_record reads. Ordinary saves through jastip_commit keep every rule.
create table if not exists jastip.buyer_credits (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references jastip.workspaces(id),
 phone text not null check(phone ~ '^[0-9]{8,20}$'),
 amount numeric not null check(abs(amount)<=1000000000000),
 kind text not null check((kind='issue' and amount>0) or (kind='use' and amount<0)),
 order_id text not null check(length(order_id) between 1 and 100),
 note text not null default '' check(length(note)<=500),
 created_by uuid,
 created_at timestamptz not null default now()
);
create index if not exists buyer_credits_phone on jastip.buyer_credits(workspace_id,phone);
alter table jastip.buyer_credits enable row level security;
revoke all on jastip.buyer_credits from public,anon,authenticated;

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
   if e->>'type' not in ('refund','credit','credit-use') or (e->>'type' in ('refund','credit') and (e->>'amount')::numeric>0) or (e->>'type'='credit-use' and (e->>'amount')::numeric<0) then raise exception 'Invalid ledger entry.';end if;
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
 if pos<oldpos and not (sub and old->>'status'='Paid' and v->>'status'='Confirmed') then raise exception 'Orders cannot move backwards.';end if;
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

-- Digits only; a local Indonesian number (0812…) counts the same as +62 812….
create or replace function jastip.phone_key(p text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(regexp_replace(coalesce(p,''),'\D','','g'),'^0','62')$$;
create or replace function jastip.credit_balance(w uuid,p text) returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(amount),0) from jastip.buyer_credits where workspace_id=w and phone=jastip.phone_key(p)$$;

-- Shared start of every order write: lock the workspace, check role, status and revision.
create or replace function jastip.order_write_begin(p_workspace uuid,p_revision bigint,p_roles text[]) returns text language plpgsql security definer set search_path='' as $$
declare w jastip.workspaces;r text;begin
 select * into w from jastip.workspaces where id=p_workspace for update;r:=jastip.role_for(w.id);
 if r is null then raise exception 'Workspace write access denied.';end if;
 if not (r=any(p_roles)) then raise exception 'Only owners and managers can do this.';end if;
 if w.status in ('Suspended','Closed','Past due') then raise exception 'This workspace cannot accept changes. Contact the platform owner.';end if;
 if w.status='Trial' and coalesce(w.trial_ends_at,now())<=now() then raise exception 'Your trial has ended. Contact the platform owner to activate a plan.';end if;
 if w.revision is distinct from p_revision then raise exception 'Another user changed this workspace. Refresh and try again.';end if;
 return r;end$$;
create or replace function jastip.order_write_end(p_workspace uuid,p_event text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform set_config('jastip.ledger','off',true);perform set_config('jastip.substitute','off',true);
 update jastip.workspaces set revision=revision+1 where id=p_workspace;
 insert into jastip.audit(workspace_id,actor,event) values(p_workspace,auth.uid(),left(p_event,500));
 return public.jastip_load_workspace(p_workspace);end$$;
create or replace function jastip.ledger_line(p_amount numeric,p_type text,p_note text) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('amount',p_amount,'type',p_type,'method',case p_type when 'refund' then 'Refund' when 'credit' then 'Credit issued' else 'Credit' end,
  'date',to_char(current_date,'YYYY-MM-DD'),'note',left(btrim(coalesce(p_note,'')),500))$$;
create or replace function jastip.locked_order(w uuid,p_order text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o jsonb;begin
 select data into o from jastip.records where workspace_id=w and kind='orders' and id=p_order for update;
 if o is null then raise exception 'Order not found.';end if;return o;end$$;
create or replace function jastip.save_order(w uuid,v jsonb) returns void language sql security definer set search_path='' as $$
 update jastip.records set data=v,updated_at=now() where workspace_id=w and kind='orders' and id=v->>'id'$$;
-- Return or take catalog stock for an order line (no-op for unlimited items).
create or replace function jastip.move_stock(w uuid,p_item text,p_delta integer) returns void language plpgsql security definer set search_path='' as $$
declare i jsonb;begin
 if p_item is null or p_delta=0 then return;end if;
 select data into i from jastip.records where workspace_id=w and kind='items' and id=p_item for update;
 if i is null or jastip.is_unlimited(i) then return;end if;
 if (i->>'qty')::int+p_delta<0 then raise exception 'Only % left of %.',i->>'qty',i->>'name';end if;
 update jastip.records set data=jsonb_set(data,'{qty}',to_jsonb((i->>'qty')::int+p_delta)),updated_at=now() where workspace_id=w and kind='items' and id=p_item;end$$;

-- 1. Item unavailable: cancel before purchase, put stock back, refund or credit everything paid.
create or replace function public.jastip_order_unavailable(p_workspace uuid,p_revision bigint,p_order_id text,p_mode text,p_note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.order_write_begin(p_workspace,p_revision,array['Owner','Manager']);old jsonb:=jastip.locked_order(p_workspace,p_order_id);v jsonb;amt numeric;begin
 if old->>'status' not in ('Requested','Quoted','Confirmed','Paid') then raise exception 'Only orders that are not bought yet can be marked unavailable.';end if;
 if coalesce(p_mode,'') not in ('refund','credit') then raise exception 'Choose refund or credit.';end if;
 amt:=coalesce((old->>'paid')::numeric,0);
 if p_mode='credit' and amt>0 and length(jastip.phone_key(old->>'phone'))<8 then raise exception 'This buyer has no WhatsApp number to keep credit under.';end if;
 v:=old||jsonb_build_object('status','Cancelled','unavailable',jsonb_build_object('date',now(),'mode',p_mode,'note',left(btrim(coalesce(p_note,'')),500)));
 if amt>0 then v:=v||jsonb_build_object('paid',0,'payments',coalesce(old->'payments','[]'::jsonb)||jsonb_build_array(jastip.ledger_line(-amt,p_mode,p_note)));end if;
 perform set_config('jastip.ledger','on',true);
 perform jastip.validate_record(p_workspace,'orders',v,old,r);
 perform jastip.save_order(p_workspace,v);
 if old->>'status' in ('Requested','Quoted','Confirmed','Paid') then perform jastip.move_stock(p_workspace,old->>'itemId',(old->>'qty')::int);end if;
 if p_mode='credit' and amt>0 then insert into jastip.buyer_credits(workspace_id,phone,amount,kind,order_id,note,created_by) values(p_workspace,jastip.phone_key(old->>'phone'),amt,'issue',old->>'id',left(btrim(coalesce(p_note,'')),500),auth.uid());end if;
 return jastip.order_write_end(p_workspace,'Order '||(old->>'id')||' cancelled: item unavailable ('||p_mode||').');end$$;

-- 2. Partial refund or credit: before purchase (deposit/overpayment) or after delivery (compensation).
create or replace function public.jastip_order_refund(p_workspace uuid,p_revision bigint,p_order_id text,p_amount numeric,p_mode text,p_note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.order_write_begin(p_workspace,p_revision,array['Owner','Manager']);old jsonb:=jastip.locked_order(p_workspace,p_order_id);v jsonb;paid numeric;begin
 if coalesce(p_mode,'') not in ('refund','credit') then raise exception 'Choose refund or credit.';end if;
 if old->>'status' in ('Paid','Shipped','Cancelled') then raise exception 'Refunds are recorded before an order is fully paid, or after it is delivered. To cancel, mark the item unavailable.';end if;
 paid:=coalesce((old->>'paid')::numeric,0);
 if p_amount is null or p_amount<=0 or p_amount>paid then raise exception 'Enter an amount between 0 and what was paid (%).',paid;end if;
 if p_mode='credit' and length(jastip.phone_key(old->>'phone'))<8 then raise exception 'This buyer has no WhatsApp number to keep credit under.';end if;
 if length(btrim(coalesce(p_note,'')))=0 then raise exception 'Add a short reason for the refund.';end if;
 -- After delivery it is compensation and lowers the order's profit; before, it returns money not yet earned.
 v:=old||jsonb_build_object('paid',paid-p_amount,'payments',coalesce(old->'payments','[]'::jsonb)||jsonb_build_array(jastip.ledger_line(-p_amount,p_mode,p_note)||case when old->>'status'='Delivered' then '{"compensation":true}'::jsonb else '{}'::jsonb end));
 perform set_config('jastip.ledger','on',true);
 perform jastip.validate_record(p_workspace,'orders',v,old,r);
 perform jastip.save_order(p_workspace,v);
 if p_mode='credit' then insert into jastip.buyer_credits(workspace_id,phone,amount,kind,order_id,note,created_by) values(p_workspace,jastip.phone_key(old->>'phone'),p_amount,'issue',old->>'id',left(btrim(p_note),500),auth.uid());end if;
 return jastip.order_write_end(p_workspace,p_mode||' of '||p_amount||' recorded on '||(old->>'id')||'.');end$$;

-- 3. Pay with credit. Any member may record it, like an ordinary payment.
create or replace function public.jastip_use_credit(p_workspace uuid,p_revision bigint,p_order_id text,p_amount numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.order_write_begin(p_workspace,p_revision,array['Owner','Manager','Helper']);old jsonb:=jastip.locked_order(p_workspace,p_order_id);v jsonb;bal numeric;due numeric;paid numeric;total numeric;begin
 if old->>'status' in ('Cancelled','Delivered','Requested') then raise exception 'Credit can be used on quoted or confirmed orders that are still open.';end if;
 paid:=coalesce((old->>'paid')::numeric,0);total:=coalesce((old->>'total')::numeric,0);
 due:=total+coalesce(nullif(old->>'shippingFee','')::numeric,0)-paid;
 bal:=jastip.credit_balance(p_workspace,old->>'phone');
 if p_amount is null or p_amount<=0 then raise exception 'Enter a credit amount.';end if;
 if p_amount>bal then raise exception 'Only % credit is available for this buyer.',bal;end if;
 if p_amount>due then raise exception 'That is more than the % still due.',due;end if;
 v:=old||jsonb_build_object('paid',paid+p_amount,'payments',coalesce(old->'payments','[]'::jsonb)||jsonb_build_array(jastip.ledger_line(p_amount,'credit-use','')));
 if old->>'status' in ('Quoted','Confirmed') and paid+p_amount>=total then v:=v||'{"status":"Paid"}';end if;
 perform set_config('jastip.ledger','on',true);
 perform jastip.validate_record(p_workspace,'orders',v,old,r);
 perform jastip.save_order(p_workspace,v);
 insert into jastip.buyer_credits(workspace_id,phone,amount,kind,order_id,created_by) values(p_workspace,jastip.phone_key(old->>'phone'),-p_amount,'use',old->>'id',auth.uid());
 return jastip.order_write_end(p_workspace,'Credit of '||p_amount||' used on '||(old->>'id')||'.');end$$;

-- 4. Substitute on the same order (Kenny's choice), before purchase. History is kept on the order.
create or replace function public.jastip_substitute_order(p_workspace uuid,p_revision bigint,p_order_id text,p_change jsonb,p_excess_mode text default null,p_note text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=jastip.order_write_begin(p_workspace,p_revision,array['Owner','Manager']);old jsonb:=jastip.locked_order(p_workspace,p_order_id);
 v jsonb;i jsonb;qty integer;unit numeric;cost numeric;alloc numeric;name text;dep numeric;total numeric;fee numeric;paid numeric;excess numeric;begin
 if old->>'status' not in ('Confirmed','Paid') then raise exception 'Substitutes can be set on confirmed or paid orders before the item is bought.';end if;
 if jsonb_typeof(p_change) is distinct from 'object' then raise exception 'Describe the substitute item.';end if;
 if coalesce(p_change->>'qty','') !~ '^[0-9]{1,4}$' or (p_change->>'qty')::int<1 then raise exception 'Enter a quantity of at least 1.';end if;
 qty:=(p_change->>'qty')::int;
 -- Put the old item's stock back first, so swapping within the same item works.
 perform jastip.move_stock(p_workspace,old->>'itemId',(old->>'qty')::int);
 if nullif(p_change->>'itemId','') is not null then
  select data into i from jastip.records where workspace_id=p_workspace and kind='items' and id=p_change->>'itemId';
  if i is null or i->>'status'='Draft' then raise exception 'Choose an available item.';end if;
  if i->>'trip' is distinct from old->>'trip' then raise exception 'Choose an item from the same trip.';end if;
  perform jastip.move_stock(p_workspace,i->>'id',-qty);
  name:=i->>'name';unit:=(i->>'selling')::numeric;cost:=(i->>'cost')::numeric;alloc:=(i->>'allocation')::numeric;
  dep:=jastip.deposit_for(i,unit*qty,qty);
 else
  name:=btrim(coalesce(p_change->>'item',''));
  if length(name) not between 1 and 200 then raise exception 'Name the substitute item.';end if;
  if coalesce(p_change->>'unitPrice','') !~ '^[0-9]+(\.[0-9]+)?$' or (p_change->>'unitPrice')::numeric<=0 then raise exception 'Enter the new price per item.';end if;
  if coalesce(p_change->>'unitCost','') !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Enter the estimated cost per item.';end if;
  unit:=(p_change->>'unitPrice')::numeric;cost:=(p_change->>'unitCost')::numeric;alloc:=coalesce((old->>'allocation')::numeric,0);
 end if;
 total:=unit*qty;
 if dep is null then dep:=least(coalesce(nullif(old->>'deposit','')::numeric,0),total);end if;
 v:=old||jsonb_build_object('item',name,'itemId',case when i is null then null else i->'id' end,'qty',qty,'total',total,'quotedCost',cost,'allocation',alloc,'deposit',dep,
  'substitutions',coalesce(old->'substitutions','[]'::jsonb)||jsonb_build_array(jsonb_build_object('date',now(),'fromItem',old->'item','fromQty',old->'qty','fromTotal',old->'total',
   'toItem',name,'toQty',qty,'toTotal',total,'note',left(btrim(coalesce(p_note,'')),500))));
 fee:=coalesce(nullif(old->>'shippingFee','')::numeric,0);paid:=coalesce((old->>'paid')::numeric,0);excess:=paid-(total+fee);
 if excess>0 then
  if coalesce(p_excess_mode,'') not in ('refund','credit') then raise exception 'Choose refund or credit for the extra % already paid.',excess;end if;
  if p_excess_mode='credit' and length(jastip.phone_key(old->>'phone'))<8 then raise exception 'This buyer has no WhatsApp number to keep credit under.';end if;
  v:=v||jsonb_build_object('paid',paid-excess,'payments',coalesce(old->'payments','[]'::jsonb)||jsonb_build_array(jastip.ledger_line(-excess,p_excess_mode,'Substitute: '||coalesce(p_note,''))));
  perform set_config('jastip.ledger','on',true);
  if p_excess_mode='credit' then insert into jastip.buyer_credits(workspace_id,phone,amount,kind,order_id,note,created_by) values(p_workspace,jastip.phone_key(old->>'phone'),excess,'issue',old->>'id','Substitute',auth.uid());end if;
 end if;
 if old->>'status'='Paid' and (v->>'paid')::numeric<total then v:=v||'{"status":"Confirmed"}';end if;
 perform set_config('jastip.substitute','on',true);
 perform jastip.validate_record(p_workspace,'orders',v,old,r);
 perform jastip.save_order(p_workspace,v);
 return jastip.order_write_end(p_workspace,'Substitute recorded on '||(old->>'id')||': '||name||'.');end$$;

-- 5. Credit balances per buyer (members only).
create or replace function public.jastip_buyer_credits(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if jastip.role_for(p_workspace) is null then raise exception 'Workspace access denied.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('phone',phone,'balance',bal)) from (select phone,sum(amount) bal from jastip.buyer_credits where workspace_id=p_workspace group by phone having sum(amount)<>0) s),'[]'::jsonb);end$$;

revoke all on function jastip.validate_record(uuid,text,jsonb,jsonb,text),jastip.phone_key(text),jastip.credit_balance(uuid,text),jastip.order_write_begin(uuid,bigint,text[]),jastip.order_write_end(uuid,text),
 jastip.ledger_line(numeric,text,text),jastip.locked_order(uuid,text),jastip.save_order(uuid,jsonb),jastip.move_stock(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.jastip_order_unavailable(uuid,bigint,text,text,text),public.jastip_order_refund(uuid,bigint,text,numeric,text,text),public.jastip_use_credit(uuid,bigint,text,numeric),
 public.jastip_substitute_order(uuid,bigint,text,jsonb,text,text),public.jastip_buyer_credits(uuid) from public,anon,authenticated;
grant execute on function public.jastip_order_unavailable(uuid,bigint,text,text,text),public.jastip_order_refund(uuid,bigint,text,numeric,text,text),public.jastip_use_credit(uuid,bigint,text,numeric),
 public.jastip_substitute_order(uuid,bigint,text,jsonb,text,text),public.jastip_buyer_credits(uuid) to authenticated;
commit;
