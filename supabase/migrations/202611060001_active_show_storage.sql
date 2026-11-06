-- ESMOJO actieve voorbereiding. Uitvoeren als database-eigenaar in SQL Editor.
-- Geen accountprofielen, bestanden, CSV/incidenten, ticketinhoud of herkomstcijfers.
begin;
create table if not exists public.esmojo_storage_control (
 id integer primary key check (id=1), version integer not null check(version=1), enabled boolean not null default false
);
insert into public.esmojo_storage_control(id,version,enabled) values(1,1,false) on conflict(id) do nothing;
create table if not exists public.esmojo_active_shows (
 concert_id text primary key,
 aliases text[] not null,
 archive_after timestamptz not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 revision bigint not null default 0 check(revision>=0),
 lease uuid,
 lease_until timestamptz,
 pending boolean not null default true,
 archive_error boolean not null default false,
 external_command text check(external_command is null or external_command ~ '^[a-f0-9]{64}$'),
 external_started timestamptz,
 updated_at timestamptz not null default now(),
 check(length(concert_id) between 1 and 240),
 check(cardinality(aliases)>0 and concert_id=any(aliases)),
 check((lease is null)=(lease_until is null)),
 check(not snapshot ?| array['tickets','ticket_sales','visitor_origins','domestic_origins','csv','accounts','researchByNumber','pdfBase64','base64'])
);
create table if not exists public.esmojo_show_receipts (
 concert_id text not null references public.esmojo_active_shows(concert_id) on delete cascade,
 command text not null check(command ~ '^[a-f0-9]{64}$'),
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(concert_id,command)
);
alter table public.esmojo_show_receipts add column if not exists created_at timestamptz not null default now();
alter table public.esmojo_show_receipts enable row level security;
revoke all on public.esmojo_show_receipts from public,anon,authenticated;
grant select on public.esmojo_show_receipts to service_role;
create index if not exists esmojo_active_aliases on public.esmojo_active_shows using gin(aliases);
create index if not exists esmojo_active_work on public.esmojo_active_shows(archive_after,updated_at);
alter table public.esmojo_storage_control enable row level security;
alter table public.esmojo_active_shows enable row level security;
revoke all on public.esmojo_storage_control,public.esmojo_active_shows from public,anon,authenticated;
grant select on public.esmojo_storage_control to service_role;
grant select,insert,update,delete on public.esmojo_active_shows to service_role;

-- Een lease omvat de gehele read/validate/write. Alleen de server mag claimen.
-- Externe Drive-acties behouden hun lease bij een onzeker antwoord. 15 minuten
-- is langer dan de maximale Apps Script-uitvoering; geen overlappende uitvoering.
create or replace function public.esmojo_show_claim(p_id text,p_lease uuid)
returns setof public.esmojo_active_shows language sql security definer set search_path=pg_catalog as $$
 update public.esmojo_active_shows set lease=p_lease,lease_until=clock_timestamp()+interval '15 minutes'
 where concert_id=p_id and (lease is null or lease_until<clock_timestamp()) returning *;
$$;
create or replace function public.esmojo_show_commit(p_id text,p_lease uuid,p_revision bigint,p_snapshot jsonb,p_archive_after timestamptz,p_command text default null,p_result jsonb default null)
returns setof public.esmojo_active_shows language plpgsql security definer set search_path=pg_catalog as $$
 declare saved public.esmojo_active_shows;
 begin
 update public.esmojo_active_shows set snapshot=p_snapshot,revision=revision+1,archive_after=p_archive_after,
 pending=true,archive_error=false,external_command=null,external_started=null,aliases=array(select jsonb_array_elements_text(p_snapshot->'aliases')),updated_at=clock_timestamp(),lease=null,lease_until=null
 where concert_id=p_id and lease is not distinct from p_lease and revision=p_revision and (lease is null or lease_until>clock_timestamp()) returning * into saved;
 if not found then return; end if;
 if p_command is not null then
 insert into public.esmojo_show_receipts(concert_id,command,result) values(p_id,p_command,p_result) on conflict do nothing;
 delete from public.esmojo_show_receipts where concert_id=p_id and command in (
 select command from public.esmojo_show_receipts where concert_id=p_id order by created_at desc offset 200);
 end if;
 return next saved;
 end;
$$;
create or replace function public.esmojo_show_release(p_id text,p_lease uuid,p_revision bigint,p_mirrored boolean,p_error boolean)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
 begin
 update public.esmojo_active_shows set lease=null,lease_until=null,
 pending=case when p_mirrored then false else pending end,archive_error=p_error
 where concert_id=p_id and lease is not distinct from p_lease and revision=p_revision;
 return found;
 end;
$$;
create or replace function public.esmojo_show_purge(p_id text,p_lease uuid,p_revision bigint)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
 begin
 delete from public.esmojo_active_shows where concert_id=p_id and lease=p_lease and revision=p_revision and archive_after<=clock_timestamp();
 return found;
 end;
$$;
create or replace function public.esmojo_show_intent(p_id text,p_lease uuid,p_revision bigint,p_command text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
 begin
 update public.esmojo_active_shows set external_command=p_command,external_started=clock_timestamp()
 where concert_id=p_id and lease=p_lease and revision=p_revision and lease_until>clock_timestamp();
 return found;
 end;
$$;
create or replace function public.esmojo_show_error(p_id text,p_lease uuid,p_revision bigint)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
 begin
 update public.esmojo_active_shows set archive_error=true where concert_id=p_id and lease is not distinct from p_lease and revision=p_revision;
 return found;
 end;
$$;
revoke all on function public.esmojo_show_intent(text,uuid,bigint,text),public.esmojo_show_error(text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.esmojo_show_intent(text,uuid,bigint,text),public.esmojo_show_error(text,uuid,bigint) to service_role;
revoke all on function public.esmojo_show_claim(text,uuid),public.esmojo_show_commit(text,uuid,bigint,jsonb,timestamptz,text,jsonb),public.esmojo_show_release(text,uuid,bigint,boolean,boolean),public.esmojo_show_purge(text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.esmojo_show_claim(text,uuid),public.esmojo_show_commit(text,uuid,bigint,jsonb,timestamptz,text,jsonb),public.esmojo_show_release(text,uuid,bigint,boolean,boolean),public.esmojo_show_purge(text,uuid,bigint) to service_role;
-- Voorkom stil terugvallen op een oud Drive-archief met actieve DB-wijzigingen.
create or replace function public.esmojo_storage_disable_guard() returns trigger
language plpgsql set search_path=pg_catalog as $$
 begin
 if old.enabled and not new.enabled and exists(select 1 from public.esmojo_active_shows) then
 raise exception 'Archiveer actieve shows voordat databaseopslag wordt uitgeschakeld';
 end if;
 return new;
 end;
$$;
drop trigger if exists esmojo_storage_disable_guard on public.esmojo_storage_control;
create trigger esmojo_storage_disable_guard before update on public.esmojo_storage_control for each row execute function public.esmojo_storage_disable_guard();
revoke all on function public.esmojo_storage_disable_guard() from public,anon,authenticated;
commit;
-- Activeren gebeurt pas na de geslaagde applicatie-/Drive-deployment:
-- update public.esmojo_storage_control set enabled=true where id=1;
