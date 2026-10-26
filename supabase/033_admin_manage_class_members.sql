create or replace function public.manager_list_class_students(target_class_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from public.users where users.id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ quản lý mới có quyền xem danh sách học sinh.';
  end if;
  if not exists (select 1 from public.classes where classes.id = target_class_id) then
    raise exception 'Không tìm thấy lớp học.';
  end if;

  return query
  select u.id, u.full_name, u.email, u.avatar_url, cm.joined_at
  from public.class_members cm
  join public.users u on u.id = cm.student_id
  where cm.class_id = target_class_id
    and u.role = 'student'
  order by u.full_name, u.email;
end;
$$;

create or replace function public.manager_remove_student_from_class(
  target_class_id uuid,
  target_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where users.id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ quản lý mới có quyền gỡ học sinh khỏi lớp.';
  end if;
  if not exists (select 1 from public.classes where classes.id = target_class_id) then
    raise exception 'Không tìm thấy lớp học.';
  end if;
  if not exists (select 1 from public.users where users.id = target_student_id and role = 'student') then
    raise exception 'Không tìm thấy học sinh.';
  end if;

  delete from public.class_members
  where class_id = target_class_id and student_id = target_student_id;
  if not found then
    raise exception 'Học sinh này không thuộc lớp.';
  end if;

  return jsonb_build_object('class_id', target_class_id, 'student_id', target_student_id);
end;
$$;

grant execute on function public.manager_list_class_students(uuid) to authenticated;
grant execute on function public.manager_remove_student_from_class(uuid, uuid) to authenticated;
