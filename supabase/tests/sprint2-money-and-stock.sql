-- Sprint 2 (ADR-009): ongkir, refunds and credits on the ledger, unavailable items, substitutes, credit balances.
create or replace function public.test_assert(p boolean,message text) returns void language plpgsql as $$begin if p is distinct from true then raise exception 'ASSERTION: %',message;end if;end$$;
create or replace function public.test_denied(statement text,expected text) returns void language plpgsql as $$begin begin execute statement;exception when others then if position(expected in sqlerrm)=0 then raise exception 'Wrong error: % (expected %)',sqlerrm,expected;end if;return;end;raise exception 'Expected rejection: %',expected;end$$;
grant execute on function public.test_assert(boolean,text),public.test_denied(text,text) to anon,authenticated;
-- Helpers for the test: current workspace, an order by buyer name, and a commit of one order.
create or replace function public.t_w() returns uuid language sql as $$select current_setting('t2.w')::uuid$$;
create or replace function public.t_rev() returns bigint language sql as $$select (public.jastip_load_workspace(public.t_w())->>'revision')::bigint$$;
create or replace function public.t_order(p_name text) returns jsonb language sql as $$select o from jsonb_array_elements(public.jastip_load_workspace(public.t_w())->'orders') o where o->>'name'=p_name$$;
create or replace function public.t_item(p_id text) returns jsonb language sql as $$select i from jsonb_array_elements(public.jastip_load_workspace(public.t_w())->'items') i where i->>'id'=p_id$$;
create or replace function public.t_save(o jsonb) returns jsonb language sql as $$select public.jastip_commit(public.t_w(),public.t_rev(),jsonb_build_array(jsonb_build_object('kind','orders','data',o)))$$;
grant execute on function public.t_w(),public.t_rev(),public.t_order(text),public.t_item(text),public.t_save(jsonb) to anon,authenticated;
reset role;
delete from jastip.rate_limits;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000020','money-owner@example.com',now()),
 ('00000000-0000-0000-0000-000000000021','money-helper@example.com',now()) on conflict do nothing;
insert into jastip.platform_admins values('00000000-0000-0000-0000-000000000004') on conflict do nothing;

set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select set_config('t2.w',public.jastip_create_workspace('Money shop','money-shop')::text,false);
select public.jastip_commit(public.t_w(),0,'[
 {"kind":"trips","data":{"id":"trip-m","name":"Seoul","status":"Open for orders","currency":"KRW","rate":12,"budget":0,"actual":0,"units":10,"allocation":"none","start":"2026-11-01","end":"2026-11-10","dates":"1–10 Nov","city":"Seoul","hub":"Jakarta"}},
 {"kind":"items","data":{"id":"cream","trip":"trip-m","name":"Snail cream","status":"Available","currency":"KRW","rate":12,"price":10000,"markup":0,"markupMode":"percent","selling":120000,"cost":120000,"allocation":0,"qty":10,"photos":[],"deadline":"","category":"Beauty"}},
 {"kind":"items","data":{"id":"toner","trip":"trip-m","name":"Toner","status":"Available","currency":"KRW","rate":12,"price":5000,"markup":0,"markupMode":"percent","selling":60000,"cost":60000,"allocation":0,"qty":5,"photos":[],"deadline":"","category":"Beauty"}}
]'::jsonb,null,'Setup.');
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.jastip_admin_action(public.t_w(),'plan','{"plan":"Pro"}');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select set_config('t2.inv',public.jastip_invite_member(public.t_w(),'money-helper@example.com','Helper')::text,false);
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000021';select public.jastip_accept_invitation(current_setting('t2.inv')::uuid);

-- Three buyers order 2 creams each (Rp 240.000).
reset role;set role anon;set request.jwt.claim.sub='';
select public.jastip_place_order('money-shop','{"name":"Ayu","phone":"+62 811-1111-1111","address":"Jakarta Indonesia","qty":2,"itemId":"cream","consent":true}');
select public.jastip_place_order('money-shop','{"name":"Budi","phone":"628222222222","address":"Jakarta Indonesia","qty":2,"itemId":"cream","consent":true}');
select public.jastip_place_order('money-shop','{"name":"Citra","phone":"628333333333","address":"Jakarta Indonesia","qty":2,"itemId":"cream","consent":true}');
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select public.test_assert((public.t_item('cream')->>'qty')::int=4,'Three orders reserve six creams');
select public.t_save(public.t_order('Ayu')||'{"status":"Confirmed","paid":240000,"payments":[{"amount":240000,"method":"Bank transfer"}]}');
select public.t_save(public.t_order('Budi')||'{"status":"Confirmed","paid":100000,"payments":[{"amount":100000,"method":"Bank transfer"}]}');
select public.t_save(public.t_order('Citra')||'{"status":"Confirmed","paid":240000,"payments":[{"amount":240000,"method":"Bank transfer"}]}');

-- Ordinary saves cannot write refunds, credits or negative payments, or lower what was paid.
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||jsonb_build_object('paid',140000,'payments',(public.t_order('Ayu')->'payments')||'[{"amount":-100000,"type":"refund","method":"Refund"}]'::jsonb))$q$,'from the order actions');
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||jsonb_build_object('paid',140000,'payments',(public.t_order('Ayu')->'payments')||'[{"amount":-100000,"method":"Cash"}]'::jsonb))$q$,'Payments must be positive');
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||jsonb_build_object('paid',340000,'payments',(public.t_order('Ayu')->'payments')||'[{"amount":100000,"type":"credit-use","method":"Credit"}]'::jsonb))$q$,'from the order actions');
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||'{"quotedCost":1}')$q$,'pricing is frozen');

-- Ongkir: Paid allows ongkir still due; shipping needs items + ongkir; ongkir is fixed after shipping.
select public.t_save(public.t_order('Ayu')||'{"status":"Paid","shippingFee":15000}');
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||'{"shippingFee":-1}')$q$,'valid ongkir');
select public.t_save(public.t_order('Ayu')||'{"status":"Purchased","actualCost":120000}');
select public.test_denied($q$select public.jastip_ship_orders(public.t_w(),public.t_rev(),jsonb_build_array(jsonb_build_object('id',public.t_order('Ayu')->>'id','courier','JNE','resi','JNE1234567')))$q$,'full payment before shipping');
select public.t_save(public.t_order('Ayu')||jsonb_build_object('paid',255000,'payments',(public.t_order('Ayu')->'payments')||'[{"amount":15000,"method":"Bank transfer"}]'::jsonb));
select public.jastip_ship_orders(public.t_w(),public.t_rev(),jsonb_build_array(jsonb_build_object('id',public.t_order('Ayu')->>'id','courier','JNE','resi','JNE1234567')));
select public.test_denied($q$select public.t_save(public.t_order('Ayu')||'{"shippingFee":20000}')$q$,'fixed once the order ships');

-- Unavailable before purchase: cancel, stock back, all paid returned as credit to the buyer's number.
select public.test_denied($q$select public.jastip_order_unavailable(public.t_w(),public.t_rev(),public.t_order('Ayu')->>'id','refund','')$q$,'not bought yet');
select public.jastip_order_unavailable(public.t_w(),public.t_rev(),public.t_order('Citra')->>'id','credit','Sold out in Myeongdong');
select public.test_assert(public.t_order('Citra')->>'status'='Cancelled','Unavailable cancels the order');
select public.test_assert((public.t_order('Citra')->>'paid')::numeric=0,'Net paid becomes zero');
select public.test_assert(public.t_order('Citra')->'payments'->1->>'type'='credit' and (public.t_order('Citra')->'payments'->1->>'amount')::numeric=-240000,'Ledger keeps the payment and adds a credit line');
select public.test_assert((public.t_item('cream')->>'qty')::int=6,'Stock is put back');
select public.test_assert(public.jastip_buyer_credits(public.t_w())->0->>'phone'='628333333333' and (public.jastip_buyer_credits(public.t_w())->0->>'balance')::numeric=240000,'Credit balance is kept under the buyer number');
select public.test_denied($q$select public.t_save(public.t_order('Citra')||'{"note":"x"}')$q$,'This order is closed');

-- Substitute on the same order: catalog item, stock moves, Paid→Confirmed when it costs more.
select public.t_save(public.t_order('Budi')||jsonb_build_object('paid',240000,'status','Paid','payments',(public.t_order('Budi')->'payments')||'[{"amount":140000,"method":"Bank transfer"}]'::jsonb));
select public.test_denied($q$select public.jastip_substitute_order(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id','{"itemId":"toner","qty":9}')$q$,'Only 5 left');
select public.test_assert((public.t_item('cream')->>'qty')::int=6,'A failed substitute changes no stock');
select public.jastip_substitute_order(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id','{"itemId":"toner","qty":5}',null,'Cream sold out');
select public.test_assert(public.t_order('Budi')->>'item'='Toner' and (public.t_order('Budi')->>'total')::numeric=300000,'Substitute changes item and total');
select public.test_assert(public.t_order('Budi')->>'status'='Confirmed','Paid order returns to Confirmed when the substitute costs more');
select public.test_assert(public.t_order('Budi')->'substitutions'->0->>'fromItem'='Snail cream','History keeps the original item');
select public.test_assert((public.t_item('cream')->>'qty')::int=8 and (public.t_item('toner')->>'qty')::int=0,'Stock moves from the old item to the new one');
-- Cheaper custom substitute: the extra paid must go back as refund or credit.
select public.test_denied($q$select public.jastip_substitute_order(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id','{"item":"Mini toner","qty":2,"unitPrice":50000,"unitCost":40000}')$q$,'Choose refund or credit for the extra');
select public.jastip_substitute_order(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id','{"item":"Mini toner","qty":2,"unitPrice":50000,"unitCost":40000}','refund','Smaller size');
select public.test_assert((public.t_order('Budi')->>'paid')::numeric=100000 and (public.t_order('Budi')->>'total')::numeric=100000,'Extra paid is refunded and net paid matches');
select public.test_assert((public.t_item('toner')->>'qty')::int=5 and public.t_order('Budi')->'itemId' = 'null'::jsonb,'Custom substitute returns catalog stock and unlinks the item');
select public.test_assert(jsonb_array_length(public.t_order('Budi')->'substitutions')=2,'Each substitute is recorded');

-- Use credit: capped by balance and amount due; any member can use it.
reset role;set role anon;set request.jwt.claim.sub='';
select public.jastip_place_order('money-shop','{"name":"Citra again","phone":"0833-3333-3333 ","address":"Jakarta Indonesia","qty":1,"itemId":"cream","consent":true}');
reset role;
-- The buyer typed the local form of the same number; credit still finds them.
update jastip.records set data=jsonb_set(data,'{phone}','"0833-3333-333"') where kind='orders' and data->>'name'='Citra again';
set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select public.t_save(public.t_order('Citra again')||'{"status":"Confirmed"}');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000021';
select public.test_denied($q$select public.jastip_use_credit(public.t_w(),public.t_rev(),public.t_order('Citra again')->>'id',130000)$q$,'more than the 120000');
select public.jastip_use_credit(public.t_w(),public.t_rev(),public.t_order('Citra again')->>'id',120000);
reset role;set role authenticated;set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select public.test_assert(public.t_order('Citra again')->>'status'='Paid','Credit covering the total marks the order paid');
select public.test_assert((public.jastip_buyer_credits(public.t_w())->0->>'balance')::numeric=120000,'Balance goes down by what was used');
select public.test_denied($q$select public.jastip_use_credit(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id',10)$q$,'Only 0 credit');

-- Partial refund: not on Paid/Shipped orders, allowed after delivery without reopening it.
select public.test_denied($q$select public.jastip_order_refund(public.t_w(),public.t_rev(),public.t_order('Ayu')->>'id',5000,'refund','Dented box')$q$,'after it is delivered');
select public.t_save(public.t_order('Ayu')||'{"status":"Delivered"}');
select public.test_denied($q$select public.jastip_order_refund(public.t_w(),public.t_rev(),public.t_order('Ayu')->>'id',5000,'refund','')$q$,'short reason');
select public.test_denied($q$select public.jastip_order_refund(public.t_w(),public.t_rev(),public.t_order('Ayu')->>'id',999999,'refund','Too much')$q$,'between 0 and what was paid');
select public.jastip_order_refund(public.t_w(),public.t_rev(),public.t_order('Ayu')->>'id',25000,'credit','Dented box');
select public.test_assert(public.t_order('Ayu')->>'status'='Delivered' and (public.t_order('Ayu')->>'paid')::numeric=230000,'Post-delivery credit keeps the order delivered');
select public.test_assert((public.t_order('Ayu')->'payments'->-1->>'compensation')::boolean,'Post-delivery adjustments are marked as compensation');
select public.test_assert(exists(select 1 from jsonb_array_elements(public.jastip_buyer_credits(public.t_w())) c where c->>'phone'='6281111111111' and (c->>'balance')::numeric=25000),'Compensation credit is kept for the buyer');

-- Roles and access.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000021';
select public.test_denied($q$select public.jastip_order_unavailable(public.t_w(),public.t_rev(),public.t_order('Citra again')->>'id','refund','')$q$,'Only owners and managers');
select public.test_denied($q$select public.jastip_substitute_order(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id','{"item":"x","qty":1,"unitPrice":1,"unitCost":0}')$q$,'Only owners and managers');
select public.test_denied($q$select public.jastip_order_refund(public.t_w(),public.t_rev(),public.t_order('Budi')->>'id',1,'refund','x')$q$,'Only owners and managers');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.test_denied($q$select public.jastip_buyer_credits(public.t_w())$q$,'access denied');
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000020';
select public.test_denied($q$select public.jastip_order_refund(public.t_w(),0,public.t_order('Ayu')->>'id',1,'refund','x')$q$,'Another user changed');
reset role;set role anon;
select public.test_denied('select count(*) from jastip.buyer_credits','permission denied');
select public.test_denied($q$select public.jastip_buyer_credits(current_setting('t2.w')::uuid)$q$,'permission denied');
reset role;
select public.test_assert((select count(*) from jastip.buyer_credits where workspace_id=current_setting('t2.w')::uuid)=3,'Credit rows are append-only history (2 issues, 1 use)');
select public.test_assert(exists(select 1 from jastip.audit where workspace_id=current_setting('t2.w')::uuid and event like 'Substitute recorded%'),'Money actions are audited');
drop function public.t_save(jsonb),public.t_order(text),public.t_item(text),public.t_rev(),public.t_w();
select 'PASS: ongkir rules, ledger exceptions only via RPCs, unavailable with credit, substitutes with stock and excess refund, use credit caps, post-delivery compensation, roles and privacy.';
