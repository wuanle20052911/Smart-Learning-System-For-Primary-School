create or replace function public.manager_update_class(
  target_class_id uuid,
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
  updated_class public.classes;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ quản lý mới có quyền chỉnh sửa lớp.';
  end if;
  if target_teacher_id is not null
    and not exists (select 1 from public.users where id = target_teacher_id and role = 'teacher') then
    raise exception 'Giáo viên được chỉ định không hợp lệ.';
  end if;
  update public.classes
  set name = trim(target_name), grade = trim(target_grade), assigned_teacher_id = target_teacher_id
  where id = target_class_id
  returning * into updated_class;
  if updated_class.id is null then raise exception 'Không tìm thấy lớp học.'; end if;
  return jsonb_build_object('id', updated_class.id, 'name', updated_class.name, 'grade', updated_class.grade, 'assigned_teacher_id', updated_class.assigned_teacher_id);
end;
$$;

grant execute on function public.manager_update_class(uuid, text, text, uuid) to authenticated;
