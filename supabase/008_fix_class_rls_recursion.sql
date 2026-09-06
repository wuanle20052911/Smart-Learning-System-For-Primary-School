-- Break the classes <-> class_members RLS policy cycle.
create or replace function public.is_class_owner(target_class_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes
    where id = target_class_id
      and created_by = target_user_id
  );
$$;

create or replace function public.is_class_member(target_class_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_members
    where class_id = target_class_id
      and student_id = target_user_id
  );
$$;

grant execute on function public.is_class_owner(uuid, uuid) to authenticated;
grant execute on function public.is_class_member(uuid, uuid) to authenticated;

drop policy if exists "Teachers manage their classes" on public.classes;
drop policy if exists "Members view their classes" on public.classes;
drop policy if exists "Teachers manage class members" on public.class_members;
drop policy if exists "Students view own membership" on public.class_members;

create policy "Teachers manage their classes"
  on public.classes for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Members view their classes"
  on public.classes for select
  using (public.is_class_member(id, auth.uid()));

create policy "Teachers manage class members"
  on public.class_members for all
  using (public.is_class_owner(class_id, auth.uid()))
  with check (public.is_class_owner(class_id, auth.uid()));

create policy "Students view own membership"
  on public.class_members for select
  using (student_id = auth.uid());
