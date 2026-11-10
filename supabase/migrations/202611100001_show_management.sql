-- Optioneel Showbeheer. Alleen de Vercel-server gebruikt deze tabel/RPC.
begin;
create table if not exists public.esmojo_show_management (
 id uuid primary key,
 concert_id text not null unique check(length(concert_id) between 1 and 240),
 access_hash text not null unique check(access_hash ~ '^[a-f0-9]{64}$'),
 pin_hash text not null check(pin_hash ~ '^[a-f0-9]{64}$'),
 sealed_credentials text not null,
 enabled boolean not null default true,
 progress jsonb not null default '{"staff":"empty","environment":"empty","policy":"empty","reports":"empty"}'::jsonb,
 created_at timestamptz not null default now(),
 attempt_count integer not null default 0 check(attempt_count>=0),
 attempt_until timestamptz not null default now()
);
alter table public.esmojo_show_management enable row level security;
revoke all on public.esmojo_show_management from public,anon,authenticated;
grant select,insert on public.esmojo_show_management to service_role;
-- Een gedeelde, atomaire limiet per geheime showlink, ook bij parallelle verzoeken.
-- Geen IP-adressen, geen gebruikersprofielen; geen koppeling met showafronding.
create or replace function public.esmojo_show_management_attempt(p_hash text)
returns setof public.esmojo_show_management
language sql security definer set search_path=pg_catalog,public as $$
 update public.esmojo_show_management
 set attempt_count=case when attempt_until<=now() then 1 else attempt_count+1 end,
     attempt_until=case when attempt_until<=now() then now()+interval '15 minutes' else attempt_until end
 where access_hash=p_hash and enabled and (attempt_until<=now() or attempt_count<10)
 returning *;
$$;
revoke all on function public.esmojo_show_management_attempt(text) from public,anon,authenticated;
grant execute on function public.esmojo_show_management_attempt(text) to service_role;
commit;
