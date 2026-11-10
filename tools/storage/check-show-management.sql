\set ON_ERROR_STOP on
begin;
set role service_role;
insert into public.esmojo_show_management(id,concert_id,access_hash,pin_hash,sealed_credentials)
values('11111111-1111-4111-8111-111111111111','synthetic-showbeheer',repeat('a',64),repeat('b',64),'synthetic-encrypted-only');
-- Unieke concertkoppeling: gelijktijdige herhaalactie mag geen nieuw geheim maken.
insert into public.esmojo_show_management(id,concert_id,access_hash,pin_hash,sealed_credentials)
values('22222222-2222-4222-8222-222222222222','synthetic-showbeheer',repeat('c',64),repeat('d',64),'different') on conflict(concert_id) do nothing;
do $$ declare n integer; begin
 if (select count(*) from public.esmojo_show_management where concert_id='synthetic-showbeheer')<>1 then raise exception 'Dubbele show'; end if;
 for i in 1..10 loop
  select count(*) into n from public.esmojo_show_management_attempt(repeat('a',64));
  if n<>1 then raise exception 'Geldige poging ontbreekt'; end if;
 end loop;
 select count(*) into n from public.esmojo_show_management_attempt(repeat('a',64));
 if n<>0 then raise exception 'Pogingslimiet omzeild'; end if;
 select count(*) into n from public.esmojo_show_management_attempt(repeat('e',64));
 if n<>0 then raise exception 'Onbekende link geaccepteerd'; end if;
end $$;
reset role;
-- Window reset en blokkering werken ook zonder gegevens te verwijderen.
update public.esmojo_show_management set attempt_until=now()-interval '1 second' where concert_id='synthetic-showbeheer';
set role service_role;
do $$ declare n integer; begin
 select count(*) into n from public.esmojo_show_management_attempt(repeat('a',64));
 if n<>1 then raise exception 'Window niet heropend'; end if;
 if (select attempt_count from public.esmojo_show_management where concert_id='synthetic-showbeheer')<>1 then raise exception 'Teller niet gereset'; end if;
end $$;
reset role;
update public.esmojo_show_management set enabled=false where concert_id='synthetic-showbeheer';
set role service_role;
do $$ begin
 if exists(select * from public.esmojo_show_management_attempt(repeat('a',64))) then raise exception 'Geblokkeerde show toegankelijk'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform * from public.esmojo_show_management;raise exception 'Anonieme tabeltoegang';exception when insufficient_privilege then null;end;
 begin perform public.esmojo_show_management_attempt(repeat('a',64));raise exception 'Anonieme RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role authenticated;
do $$ begin
 begin perform * from public.esmojo_show_management;raise exception 'Directe accounttoegang';exception when insufficient_privilege then null;end;
 begin perform public.esmojo_show_management_attempt(repeat('a',64));raise exception 'Account-RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
