create or replace function public.teacher_list_class_students(target_class_id uuid)
returns table (id uuid, full_name text, email text, avatar_url text, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.full_name, u.email, u.avatar_url, cm.joined_at
  from public.class_members cm
  join public.users u on u.id = cm.student_id
  join public.classes c on c.id = cm.class_id
  where cm.class_id = target_class_id
    and u.role = 'student'
    and (
      c.created_by = auth.uid()
      or c.assigned_teacher_id = auth.uid()
      or exists (select 1 from public.users manager where manager.id = auth.uid() and manager.role = 'admin')
    )
  order by u.full_name, u.email;
$$;

grant execute on function public.teacher_list_class_students(uuid) to authenticated;
