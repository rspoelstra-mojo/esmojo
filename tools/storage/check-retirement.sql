\set ON_ERROR_STOP on
-- Isolated CI only: original synthetic rows must survive privilege retirement.
insert into public.esmojo_active_shows(concert_id,aliases,archive_after,snapshot) values('retained-synthetic',array['retained-synthetic'],now(),'{}');
create schema auth;
create table auth.retained_auth_marker(id integer primary key);
insert into auth.retained_auth_marker values(1);
grant select on auth.retained_auth_marker to service_role;
\ir ../../supabase/migrations/202611150001_retire_business_storage.sql
\ir ../../supabase/migrations/202611150001_retire_business_storage.sql
do $$
declare principal text; object_name text; routine regprocedure;
begin
 foreach principal in array array['anon','authenticated','service_role'] loop
  foreach object_name in array array['esmojo_storage_control','esmojo_active_shows','esmojo_show_receipts','esmojo_show_management'] loop
   if has_table_privilege(principal,'public.'||object_name,'select,insert,update,delete') then raise exception 'Retired business table privilege remains';end if;
  end loop;
  for routine in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in ('esmojo_show_claim','esmojo_show_commit','esmojo_show_release','esmojo_show_purge','esmojo_show_intent','esmojo_show_error','esmojo_show_management_attempt') loop
   if has_function_privilege(principal,routine,'execute') then raise exception 'Retired business RPC privilege remains';end if;
  end loop;
 end loop;
 if (select count(*) from public.esmojo_active_shows where concert_id='retained-synthetic')<>1 then raise exception 'Original row lost';end if;
 if not has_table_privilege('service_role','auth.retained_auth_marker','select') or (select count(*) from auth.retained_auth_marker)<>1 then raise exception 'Auth permissions changed';end if;
end $$;
