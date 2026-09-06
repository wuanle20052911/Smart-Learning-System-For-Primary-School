create or replace function public.add_student_to_class(target_class_id uuid, target_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher_id uuid := auth.uid();
  matched_student_id uuid;
  class_record public.classes;
begin
  select * into class_record
  from public.classes
  where id = target_class_id and created_by = teacher_id;

  if class_record.id is null then
    raise exception 'Bạn không có quyền quản lý lớp này.';
  end if;

  select u.id into matched_student_id
  from public.users as u
  where lower(u.email) = lower(trim(target_email))
    and u.role = 'student';

  if matched_student_id is null then
    raise exception 'Không tìm thấy học sinh với email này.';
  end if;

  insert into public.class_members (class_id, student_id)
  values (target_class_id, matched_student_id)
  on conflict (class_id, student_id) do nothing;

  return jsonb_build_object('class_id', target_class_id, 'student_id', matched_student_id);
end;
$$;

grant execute on function public.add_student_to_class(uuid, text) to authenticated;
