-- Sprint 1 (ADR-008): message templates, shipping with courier/resi, tracking.
create or replace function public.test_assert(p boolean,message text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'ASSERTION: %',message;end if;end$$;
create or replace function public.test_denied(statement text,expected text) returns void language plpgsql as $$begin begin execute statement;exception when others then if position(expected in sqlerrm)=0 then raise exception 'Wrong error: % (expected %)',sqlerrm,expected;end if;return;end;raise exception 'Expected rejection: %',expected;end$$;
grant execute on function public.test_assert(boolean,text),public.test_denied(text,text) to anon,authenticated;
reset role;
delete from jastip.rate_limits;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000010','ship-owner@example.com',now()),
 ('00000000-0000-0000-0000-000000000011','ship-helper@example.com',now()),
 ('00000000-0000-0000-0000-000000000012','ship-outsider@example.com',now()) on conflict do nothing;

-- Owner sets up a trip, an item, and a helper.
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000010';
select set_config('t.w',public.jastip_create_workspace('Ship shop','ship-shop')::text,false);
select public.jastip_commit(current_setting('t.w')::uuid,0,'[
 {"kind":"trips","data":{"id":"trip-s","name":"Tokyo","status":"Open for orders","currency":"JPY","rate":105,"budget":0,"actual":0,"units":10,"allocation":"none","start":"2026-11-01","end":"2026-11-10","dates":"1–10 Nov","city":"Tokyo","hub":"Jakarta"}},
 {"kind":"items","data":{"id":"item-s","trip":"trip-s","name":"Matcha","status":"Available","currency":"JPY","rate":105,"price":1000,"markup":0,"markupMode":"percent","selling":105000,"cost":105000,"allocation":0,"qty":10,"photos":[],"deadline":"","category":"Food & drink"}}
]'::jsonb,null,'Setup.');
-- Helpers need a plan with more than one member.
reset role;insert into jastip.platform_admins values('00000000-0000-0000-0000-000000000004') on conflict do nothing;
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.jastip_admin_action(current_setting('t.w')::uuid,'plan','{"plan":"Pro"}');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000010';
select set_config('t.inv',public.jastip_invite_member(current_setting('t.w')::uuid,'ship-helper@example.com','Helper')::text,false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';select public.jastip_accept_invitation(current_setting('t.inv')::uuid);

-- Templates: owner saves; helper reads but cannot write; outsiders see nothing.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000010';
select public.test_assert(public.jastip_messaging(current_setting('t.w')::uuid)='{}'::jsonb,'New workspaces have no saved templates');
select public.jastip_save_messaging(current_setting('t.w')::uuid,'{"templates":{"quote":"Kak {nama}, total {total}.","unknown":"dropped"},"bank":{"bank":" BCA ","number":"123 456 7890","holder":"Rina"}}');
select public.test_assert(public.jastip_messaging(current_setting('t.w')::uuid)->'templates'->>'quote'='Kak {nama}, total {total}.','Owner can save a template');
select public.test_assert(not (public.jastip_messaging(current_setting('t.w')::uuid)->'templates' ? 'unknown'),'Unknown template keys are dropped');
select public.test_assert(public.jastip_messaging(current_setting('t.w')::uuid)->'bank'->>'bank'='BCA','Bank fields are trimmed');
select public.test_denied($q$select public.jastip_save_messaging(current_setting('t.w')::uuid,jsonb_build_object('templates',jsonb_build_object('quote',repeat('a',1001))))$q$,'up to 1,000 characters');
select public.test_denied($q$select public.jastip_save_messaging(current_setting('t.w')::uuid,'{"bank":{"number":"12ab34"}}')$q$,'digits, spaces or dashes');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
select public.test_assert(public.jastip_messaging(current_setting('t.w')::uuid)->'bank'->>'number'='123 456 7890','Helpers can read templates');
select public.test_denied($q$select public.jastip_save_messaging(current_setting('t.w')::uuid,'{}')$q$,'Only owners and managers');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
select public.test_denied($q$select public.jastip_messaging(current_setting('t.w')::uuid)$q$,'Workspace access denied');
reset role;set role anon;set request.jwt.claim.sub='';
select public.test_denied($q$select public.jastip_messaging(current_setting('t.w')::uuid)$q$,'permission denied');
select public.test_denied('select count(*) from jastip.workspace_settings','permission denied');

-- A buyer orders; the owner confirms it, takes full payment and buys it.
select set_config('t.o',public.jastip_place_order('ship-shop','{"name":"Dewi","phone":"628123456789","address":"Jakarta Indonesia","qty":1,"itemId":"item-s","consent":true}')::text,false);
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000010';
do $$declare d jsonb;o jsonb;begin
 d:=public.jastip_load_workspace(current_setting('t.w')::uuid);o:=(d->'orders'->0)||'{"status":"Confirmed"}';
 perform public.jastip_commit(current_setting('t.w')::uuid,(d->>'revision')::bigint,jsonb_build_array(jsonb_build_object('kind','orders','data',o)));
 d:=public.jastip_load_workspace(current_setting('t.w')::uuid);o:=d->'orders'->0;
 -- Not purchased yet: shipping is refused and nothing changes.
 perform public.test_denied(format('select public.jastip_ship_orders(%L,%s,%L::jsonb)',current_setting('t.w'),d->>'revision',jsonb_build_array(jsonb_build_object('id',o->>'id','courier','JNE','resi','JNE123456'))::text),'Purchase this order before shipping');
 o:=o||'{"paid":105000,"status":"Paid","payments":[{"amount":105000,"method":"Bank transfer"}]}';
 perform public.jastip_commit(current_setting('t.w')::uuid,(d->>'revision')::bigint,jsonb_build_array(jsonb_build_object('kind','orders','data',o)));
 d:=public.jastip_load_workspace(current_setting('t.w')::uuid);o:=(d->'orders'->0)||'{"status":"Purchased","actualCost":100000,"purchaseFxRate":1}';
 perform public.jastip_commit(current_setting('t.w')::uuid,(d->>'revision')::bigint,jsonb_build_array(jsonb_build_object('kind','orders','data',o)));end$$;

-- Validation: courier list, resi format, stale revision, batch size.
do $$declare d jsonb:=public.jastip_load_workspace(current_setting('t.w')::uuid);id text:=d->'orders'->0->>'id';q text;begin
 q:='select public.jastip_ship_orders(%L,%s,%L::jsonb)';
 perform public.test_denied(format(q,current_setting('t.w'),d->>'revision',jsonb_build_array(jsonb_build_object('id',id,'courier','<b>Moon</b>','resi','X1234'))::text),'Choose a courier');
 perform public.test_denied(format(q,current_setting('t.w'),d->>'revision',jsonb_build_array(jsonb_build_object('id',id,'courier','JNE','resi',''))::text),'Enter the tracking number');
 perform public.test_denied(format(q,current_setting('t.w'),d->>'revision',jsonb_build_array(jsonb_build_object('id',id,'courier','JNE','resi','<script>'))::text),'letters, numbers and dashes');
 perform public.test_denied(format(q,current_setting('t.w'),(d->>'revision')::bigint-1,jsonb_build_array(jsonb_build_object('id',id,'courier','JNE','resi','JNE123456'))::text),'Another user changed');
 perform public.test_denied(format(q,current_setting('t.w'),d->>'revision','[]'),'between 1 and 100');
 -- Atomic batch: a bad second entry rolls back the first.
 perform public.test_denied(format(q,current_setting('t.w'),d->>'revision',jsonb_build_array(jsonb_build_object('id',id,'courier','JNE','resi','JNE123456'),jsonb_build_object('id','missing','courier','JNE','resi','JNE999999'))::text),'not found');
 perform public.test_assert(public.jastip_load_workspace(current_setting('t.w')::uuid)->'orders'->0->>'status'='Purchased','A failed batch changes nothing');end$$;

-- A helper ships it with a resi; only the four shipping fields change.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
do $$declare d jsonb:=public.jastip_load_workspace(current_setting('t.w')::uuid);o jsonb;before jsonb;begin
 reset role;select data into before from jastip.records where kind='orders' and workspace_id=current_setting('t.w')::uuid;set role authenticated;
 d:=public.jastip_ship_orders(current_setting('t.w')::uuid,(d->>'revision')::bigint,jsonb_build_array(jsonb_build_object('id',d->'orders'->0->>'id','courier','J&T','resi',' jt0012345678 ')));
 o:=d->'orders'->0;
 perform public.test_assert(o->>'status'='Shipped','Helpers can ship purchased, paid orders');
 perform public.test_assert(o->>'resi'='JT0012345678','Resi is trimmed and upper-cased');
 perform public.test_assert(not (o ? 'quotedCost'),'Helpers still do not receive cost fields after shipping');
 reset role;
 perform public.test_assert((select data-array['status','courier','resi','shippedAt'] from jastip.records where kind='orders' and workspace_id=current_setting('t.w')::uuid)=before-array['status','courier','resi','shippedAt'],'Shipping changes only status, courier, resi and shippedAt');
 perform public.test_assert(exists(select 1 from jastip.audit where workspace_id=current_setting('t.w')::uuid and event='1 order(s) shipped.'),'Shipping is audited');end$$;
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
select public.test_denied($q$select public.jastip_ship_orders(current_setting('t.w')::uuid,0,'[{"id":"x","courier":"JNE","resi":"JNE1234"}]')$q$,'Workspace write access denied');

-- Buyers see courier and resi on the tracking page, still without their identity.
reset role;set role anon;set request.jwt.claim.sub='';
select public.test_assert(public.jastip_track_order(current_setting('t.o')::jsonb->>'trackingToken')->>'resi'='JT0012345678','Tracking shows the resi');
select public.test_assert(public.jastip_track_order(current_setting('t.o')::jsonb->>'trackingToken')->>'courier'='J&T','Tracking shows the courier');
select public.test_assert(not (public.jastip_track_order(current_setting('t.o')::jsonb->>'trackingToken') ? 'name'),'Tracking still hides buyer identity');
select public.test_denied($q$select public.jastip_ship_orders(current_setting('t.w')::uuid,0,'[]')$q$,'permission denied');
reset role;
select 'PASS: message templates (roles, validation, privacy), shipping with courier/resi (rules, atomic batch, helper field lock, audit) and tracking.';
