alter table public.classes
  add column if not exists assigned_teacher_id uuid references public.users(id) on delete set null;

create index if not exists classes_assigned_teacher_idx
  on public.classes (assigned_teacher_id);

create or replace function public.manager_list_teachers()
returns table (id uuid, full_name text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.full_name, u.email
  from public.users u
  where u.role = 'teacher'
    and exists (select 1 from public.users manager where manager.id = auth.uid() and manager.role = 'admin')
  order by u.full_name, u.email;
$$;

create or replace function public.manager_list_classes()
returns table (
  id uuid,
  name text,
  grade text,
  created_at timestamptz,
  assigned_teacher_id uuid,
  assigned_teacher_name text,
  assigned_teacher_email text
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.name, c.grade, c.created_at, c.assigned_teacher_id,
    t.full_name, t.email
  from public.classes c
  left join public.users t on t.id = c.assigned_teacher_id
  where exists (select 1 from public.users manager where manager.id = auth.uid() and manager.role = 'admin')
  order by c.name;
$$;

create or replace function public.manager_create_class(
  target_name text,
  target_grade text,
  target_teacher_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_class public.classes;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ quản lý mới có quyền tạo lớp.';
  end if;
  if target_teacher_id is not null
    and not exists (select 1 from public.users where id = target_teacher_id and role = 'teacher') then
    raise exception 'Giáo viên được chỉ định không hợp lệ.';
  end if;

  insert into public.classes (name, grade, created_by, assigned_teacher_id)
  values (trim(target_name), trim(target_grade), auth.uid(), target_teacher_id)
  returning * into created_class;

  return jsonb_build_object(
    'id', created_class.id,
    'name', created_class.name,
    'grade', created_class.grade,
    'assigned_teacher_id', created_class.assigned_teacher_id
  );
end;
$$;

create or replace function public.manager_add_student_to_class(
  target_class_id uuid,
  target_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_student_id uuid;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ quản lý mới có quyền thêm học sinh.';
  end if;

  select id into matched_student_id
  from public.users
  where lower(email) = lower(trim(target_email))
    and role = 'student';
  if matched_student_id is null then
    raise exception 'Không tìm thấy học sinh với email này.';
  end if;
  if not exists (select 1 from public.classes where id = target_class_id) then
    raise exception 'Không tìm thấy lớp học.';
  end if;

  insert into public.class_members (class_id, student_id)
  values (target_class_id, matched_student_id)
  on conflict (class_id, student_id) do nothing;
  return jsonb_build_object('class_id', target_class_id, 'student_id', matched_student_id);
end;
$$;

grant execute on function public.manager_list_teachers() to authenticated;
grant execute on function public.manager_list_classes() to authenticated;
grant execute on function public.manager_create_class(text, text, uuid) to authenticated;
grant execute on function public.manager_add_student_to_class(uuid, text) to authenticated;

drop policy if exists "Teachers manage their classes" on public.classes;
create policy "Managers and assigned teachers manage classes"
  on public.classes for all
  using (
    auth.uid() = created_by
    or auth.uid() = assigned_teacher_id
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = created_by
    or auth.uid() = assigned_teacher_id
    or exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Teachers manage class members" on public.class_members;
create policy "Managers and assigned teachers manage class members"
  on public.class_members for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and (c.created_by = auth.uid() or c.assigned_teacher_id = auth.uid()
          or exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and (c.created_by = auth.uid() or c.assigned_teacher_id = auth.uid()
          or exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
    )
  );
