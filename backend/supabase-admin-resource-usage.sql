-- 在 Supabase SQL Editor 執行一次，讓 Admin Center 能安全讀取空間用量。
create or replace function public.get_admin_resource_usage()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, storage
as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((
      select sum(coalesce((metadata ->> 'size')::bigint, 0))
      from storage.objects
    ), 0)
  );
$$;

revoke all on function public.get_admin_resource_usage() from public, anon, authenticated;
grant execute on function public.get_admin_resource_usage() to service_role;
