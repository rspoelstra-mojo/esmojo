-- Only run after verified Dataverse cutovers. Retain all original rows/tables.
-- Auth schema, identities, sessions, MFA and the service_role itself are untouched.
begin;
do $$
declare object_name text; target regclass; routine regprocedure; principal text;
begin
 foreach object_name in array array['esmojo_storage_control','esmojo_active_shows','esmojo_show_receipts','esmojo_show_management'] loop
  target:=to_regclass('public.'||object_name);
  if target is not null then
   execute format('revoke all privileges on table %s from public, anon, authenticated, service_role',target);
   foreach principal in array array['anon','authenticated','service_role'] loop
    if has_table_privilege(principal,target,'select,insert,update,delete') then raise exception 'Retired business table privilege remains';end if;
   end loop;
  end if;
 end loop;
 foreach object_name in array array[
 'public.esmojo_show_claim(text,uuid)',
 'public.esmojo_show_commit(text,uuid,bigint,jsonb,timestamp with time zone,text,jsonb)',
 'public.esmojo_show_release(text,uuid,bigint,boolean,boolean)',
 'public.esmojo_show_purge(text,uuid,bigint)',
 'public.esmojo_show_intent(text,uuid,bigint,text)',
 'public.esmojo_show_error(text,uuid,bigint)',
 'public.esmojo_show_management_attempt(text)'] loop
  routine:=to_regprocedure(object_name);
  if routine is not null then
   execute format('revoke all privileges on function %s from public, anon, authenticated, service_role',routine);
   foreach principal in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(principal,routine,'execute') then raise exception 'Retired business RPC privilege remains';end if;
   end loop;
  end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
