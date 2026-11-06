\set ON_ERROR_STOP on
begin;
insert into public.esmojo_active_shows(concert_id,aliases,archive_after,snapshot)
values('synthetic',array['synthetic','synthetic-second'],now()-interval '1 day','{}');
set role service_role;
do $$
declare first_claim public.esmojo_active_shows; changed public.esmojo_active_shows; n integer;
begin
 select * into first_claim from public.esmojo_show_claim('synthetic','11111111-1111-4111-8111-111111111111');
 if first_claim.lease is null then raise exception 'Claim ontbreekt'; end if;
 select count(*) into n from public.esmojo_show_claim('synthetic','22222222-2222-4222-8222-222222222222');
 if n<>0 then raise exception 'Dubbele claim'; end if;
 select count(*) into n from public.esmojo_show_commit('synthetic','22222222-2222-4222-8222-222222222222',0,'{}',now(),null,null);
 if n<>0 then raise exception 'Verkeerde lease geaccepteerd'; end if;
 if not public.esmojo_show_intent('synthetic',first_claim.lease,0,repeat('a',64)) then raise exception 'Intent ontbreekt'; end if;
 select * into changed from public.esmojo_show_commit('synthetic',first_claim.lease,0,'{"aliases":["synthetic","synthetic-second"]}',now()-interval '1 day',repeat('b',64),'{"record":{"revision":1}}');
 if changed.revision<>1 or changed.lease is not null or changed.external_command is not null then raise exception 'Commit niet atomair'; end if;
 if (select count(*) from public.esmojo_show_receipts where concert_id='synthetic')<>1 then raise exception 'Ontvangstbewijs ontbreekt'; end if;
 select * into first_claim from public.esmojo_show_claim('synthetic','22222222-2222-4222-8222-222222222222');
 if public.esmojo_show_purge('synthetic',first_claim.lease,0) then raise exception 'Verouderde revisie verwijderd'; end if;
 if not public.esmojo_show_purge('synthetic',first_claim.lease,1) then raise exception 'Archiefopruiming ontbreekt'; end if;
 if (select count(*) from public.esmojo_show_receipts where concert_id='synthetic')<>0 then raise exception 'Ontvangstbewijzen achtergebleven'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform * from public.esmojo_active_shows;raise exception 'Anonieme toegang';exception when insufficient_privilege then null;end;
 begin perform public.esmojo_show_claim('synthetic','11111111-1111-4111-8111-111111111111');raise exception 'Anonieme RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin perform * from public.esmojo_show_receipts;raise exception 'Directe gebruikerstoegang';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
