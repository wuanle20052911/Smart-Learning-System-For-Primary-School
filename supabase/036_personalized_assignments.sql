alter table public.assignments
  add column if not exists target_student_id uuid references public.users(id) on delete cascade,
  add column if not exists learning_goal text not null default '';

alter table public.assignments
  drop constraint if exists assignments_target_student_requires_class;

alter table public.assignments
  add constraint assignments_target_student_requires_class
  check (target_student_id is null or class_id is not null);

alter table public.assignments
  drop constraint if exists assignments_learning_goal_length;

alter table public.assignments
  add constraint assignments_learning_goal_length
  check (char_length(learning_goal) <= 500);

create index if not exists assignments_target_student_idx
  on public.assignments (target_student_id, published, due_at);

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

grant execute on function public.is_class_member(uuid, uuid) to authenticated;

create or replace function public.teacher_list_class_students(target_class_id uuid)
returns table (id uuid, full_name text, email text, avatar_url text, joined_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1
    from public.classes c
    where c.id = target_class_id
      and (c.created_by = auth.uid() or c.assigned_teacher_id = auth.uid())
  ) then
    raise exception 'Bạn không có quyền xem danh sách học sinh của lớp này.';
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

grant execute on function public.teacher_list_class_students(uuid) to authenticated;

drop policy if exists "Students view published assignments" on public.assignments;
create policy "Students view published assignments"
  on public.assignments for select
  using (
    published = true
    and (target_student_id is null or target_student_id = auth.uid())
    and public.is_class_member(class_id, auth.uid())
  );

drop policy if exists "Students view assignment questions" on public.assignment_questions;
create policy "Students view assignment questions"
  on public.assignment_questions for select
  using (
    exists (
      select 1
      from public.assignments a
      where a.id = assignment_questions.assignment_id
        and a.published = true
        and (a.target_student_id is null or a.target_student_id = auth.uid())
        and public.is_class_member(a.class_id, auth.uid())
    )
  );

drop policy if exists "Students manage own submissions" on public.assignment_submissions;
create policy "Students manage own submissions"
  on public.assignment_submissions for all
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.published = true
        and (a.target_student_id is null or a.target_student_id = auth.uid())
        and public.is_class_member(a.class_id, auth.uid())
    )
  );
