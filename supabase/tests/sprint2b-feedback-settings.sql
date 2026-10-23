-- Feedback round 1 (ADR-010): couriers and region settings, ship v2, return credit, calling-code phone keys.
create or replace function public.test_assert(p boolean,message text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'ASSERTION: %',message;end if;end$$;
create or replace function public.test_denied(statement text,expected text) returns void language plpgsql as $$begin begin execute statement;exception when others then if position(expected in sqlerrm)=0 then raise exception 'Wrong error: % (expected %)',sqlerrm,expected;end if;return;end;raise exception 'Expected rejection: %',expected;end$$;
grant execute on function public.test_assert(boolean,text),public.test_denied(text,text) to anon,authenticated;
create or replace function public.f_w() returns uuid language sql as $$select current_setting('f.w')::uuid$$;
create or replace function public.f_rev() returns bigint language sql as $$select (public.jastip_load_workspace(public.f_w())->>'revision')::bigint$$;
create or replace function public.f_order(p_name text) returns jsonb language sql as $$select o from jsonb_array_elements(public.jastip_load_workspace(public.f_w())->'orders') o where o->>'name'=p_name$$;
create or replace function public.f_save(o jsonb) returns jsonb language sql as $$select public.jastip_commit(public.f_w(),public.f_rev(),jsonb_build_array(jsonb_build_object('kind','orders','data',o)))$$;
grant execute on function public.f_w(),public.f_rev(),public.f_order(text),public.f_save(jsonb) to anon,authenticated;
reset role;
delete from jastip.rate_limits;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000030','sg-owner@example.com',now()),
 ('00000000-0000-0000-0000-000000000031','sg-helper@example.com',now()),
 ('00000000-0000-0000-0000-000000000004','admin@example.com',now()) on conflict do nothing;
insert into jastip.platform_admins values('00000000-0000-0000-0000-000000000004') on conflict do nothing;

set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000030';
select set_config('f.w',public.jastip_create_workspace('Lion City finds','lion-city')::text,false);
select public.jastip_commit(public.f_w(),0,'[
 {"kind":"trips","data":{"id":"trip-t","name":"Tokyo","status":"Open for orders","currency":"JPY","rate":105,"budget":0,"actual":0,"units":10,"allocation":"none","start":"2026-11-01","end":"2026-11-10","dates":"1–10 Nov","city":"Tokyo","hub":"Jakarta"}},
 {"kind":"items","data":{"id":"tea","trip":"trip-t","name":"Tea","status":"Available","currency":"JPY","rate":105,"price":1000,"markup":0,"markupMode":"percent","selling":105000,"cost":105000,"allocation":0,"qty":10,"photos":[],"deadline":"","category":"Food & drink"}}
]'::jsonb,null,'Setup.');
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.jastip_admin_action(public.f_w(),'plan','{"plan":"Pro"}');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000030';
select set_config('f.inv',public.jastip_invite_member(public.f_w(),'sg-helper@example.com','Helper')::text,false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000031';select public.jastip_accept_invitation(current_setting('f.inv')::uuid);

-- Defaults: Indonesia region and Indonesian couriers until changed.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000030';
select public.test_assert(public.jastip_settings(public.f_w())->'region'->>'callingCode'='62','Region defaults to Indonesia');
select public.test_assert(exists(select 1 from jsonb_array_elements(public.jastip_settings(public.f_w())->'couriers') c where c->>'name'='JNE'),'Indonesian default couriers');
-- Switch to Singapore: couriers default per country, calling code 65, English messages.
select public.jastip_save_settings(public.f_w(),'{"region":{"country":"SG","callingCode":"65","language":"en"}}');
select public.test_assert(public.jastip_settings(public.f_w())->'couriers'->0->>'name'='Local courier','Default couriers follow the country');
select public.jastip_save_settings(public.f_w(),'{"couriers":[{"name":"Ninja Van","tracking":true},{"name":"Grab","tracking":false},{"name":"SingPost"}]}');
select public.test_assert(jsonb_array_length(public.jastip_settings(public.f_w())->'couriers')=3,'Owner saves their own courier list');
select public.test_assert((public.jastip_settings(public.f_w())->'couriers'->2->>'tracking')::boolean,'Tracking defaults to on');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"couriers":[{"name":"A"},{"name":"a"}]}')$q$,'listed twice');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"couriers":[]}')$q$,'between 1 and 30');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"couriers":[{"name":"<x>"}]}')$q$,'1–40 characters');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"region":{"callingCode":"+65"}}')$q$,'calling code');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"region":{"language":"fr"}}')$q$,'message language');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000031';
select public.test_assert(public.jastip_settings(public.f_w())->'region'->>'country'='SG','Helpers can read settings');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"region":{"country":"ID"}}')$q$,'Only owners and managers');
reset role;set role anon;
select public.test_denied($q$select public.jastip_settings(current_setting('f.w')::uuid)$q$,'permission denied');

-- A Singapore buyer orders twice; the second order types the local form of the same number.
select public.jastip_place_order('lion-city','{"name":"Wei","phone":"+65 8123 4567","address":"Orchard Road Singapore","qty":2,"itemId":"tea","consent":true}');
select public.jastip_place_order('lion-city','{"name":"Wei again","phone":"+65 8123 4567","address":"Orchard Road Singapore","qty":1,"itemId":"tea","consent":true}');
reset role;
update jastip.records set data=jsonb_set(data,'{phone}','"08123 4567"') where kind='orders' and data->>'name'='Wei again';
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000030';
select public.f_save(public.f_order('Wei')||'{"status":"Confirmed","paid":210000,"payments":[{"amount":210000,"method":"PayNow"}]}');
select public.jastip_order_unavailable(public.f_w(),public.f_rev(),public.f_order('Wei')->>'id','credit','Sold out');
select public.test_assert(public.jastip_buyer_credits(public.f_w())->0->>'phone'='6581234567','Credit is keyed with the workspace calling code');
select public.test_denied($q$select public.jastip_save_settings(public.f_w(),'{"region":{"callingCode":"60"}}')$q$,'can’t change after buyers have credit');

-- Use credit on the second order (local number form), then return part of it.
select public.f_save(public.f_order('Wei again')||'{"status":"Confirmed"}');
select public.jastip_use_credit(public.f_w(),public.f_rev(),public.f_order('Wei again')->>'id',105000);
select public.test_assert(public.f_order('Wei again')->>'status'='Paid','Local number form finds the same credit');
select public.test_denied($q$select public.f_save(public.f_order('Wei again')||jsonb_build_object('paid',55000,'payments',(public.f_order('Wei again')->'payments')||'[{"amount":-50000,"type":"credit-return","method":"Credit returned"}]'::jsonb))$q$,'from the order actions');
select public.test_denied($q$select public.jastip_return_credit(public.f_w(),public.f_rev(),public.f_order('Wei again')->>'id',200000)$q$,'Only 105000 of credit was used');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000031';
select public.jastip_return_credit(public.f_w(),public.f_rev(),public.f_order('Wei again')->>'id',50000);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000030';
select public.test_assert(public.f_order('Wei again')->>'status'='Confirmed' and (public.f_order('Wei again')->>'paid')::numeric=55000,'Partial return lowers paid and reopens the order');
select public.test_assert((public.jastip_buyer_credits(public.f_w())->0->>'balance')::numeric=155000,'Returned credit is back on the balance');
select public.test_denied($q$select public.jastip_return_credit(public.f_w(),public.f_rev(),public.f_order('Wei again')->>'id',60000)$q$,'Only 55000 of credit');

-- Ship v2: saved courier without tracking needs no number; a new courier is added to the list.
select public.f_save(public.f_order('Wei again')||jsonb_build_object('paid',105000,'payments',(public.f_order('Wei again')->'payments')||'[{"amount":50000,"method":"PayNow"}]'::jsonb));
select public.f_save(public.f_order('Wei again')||'{"status":"Purchased","actualCost":100000}');
select public.test_denied($q$select public.jastip_ship_orders(public.f_w(),public.f_rev(),jsonb_build_array(jsonb_build_object('id',public.f_order('Wei again')->>'id','courier','ninja van','resi',''))) $q$,'Enter the tracking number');
select public.jastip_ship_orders(public.f_w(),public.f_rev(),jsonb_build_array(jsonb_build_object('id',public.f_order('Wei again')->>'id','courier','grab','resi','')));
select public.test_assert(public.f_order('Wei again')->>'courier'='Grab','Courier names match the saved list, ignoring case');
select public.test_denied($q$select public.jastip_return_credit(public.f_w(),public.f_rev(),public.f_order('Wei again')->>'id',1)$q$,'before the order ships');
reset role;
update jastip.records set data=data||'{"status":"Purchased"}'::jsonb where kind='orders' and data->>'name'='Wei again';
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000031';
select public.jastip_ship_orders(public.f_w(),public.f_rev(),jsonb_build_array(jsonb_build_object('id',public.f_order('Wei again')->>'id','courier','Uncle Lim Van','resi','','tracking',false)));
select public.test_assert(exists(select 1 from jsonb_array_elements(public.jastip_settings(public.f_w())->'couriers') c where c->>'name'='Uncle Lim Van' and not (c->>'tracking')::boolean),'A new courier from the ship dialog is saved to the list');
reset role;
drop function public.f_save(jsonb),public.f_order(text),public.f_rev(),public.f_w();
select 'PASS: couriers and region settings (roles, validation, country defaults, calling-code lock), ship v2 with saved/new couriers, partial return credit, calling-code phone keys.';
