do $$
begin
  if exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_type.typname = 'vector'
      and pg_namespace.nspname = 'extensions'
  ) then
    execute 'drop function if exists public.match_lesson_chunks(extensions.vector, integer, uuid[])';
  end if;
end;
$$;

drop table if exists public.lesson_chunks;
