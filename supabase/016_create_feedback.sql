create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  comment text not null check (char_length(trim(comment)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists feedback_submission_idx
  on public.feedback (submission_id, created_at desc);

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('teacher', 'admin')
  );
$$;

drop policy if exists "Teachers view student profiles" on public.users;
create policy "Teachers view student profiles" on public.users
  for select using (auth.uid() = id or public.is_teacher_or_admin());

alter table public.feedback enable row level security;

create policy "Teachers manage feedback for their assignments"
  on public.feedback for all
  using (
    exists (
      select 1
      from public.assignment_submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = feedback.submission_id
        and a.created_by = auth.uid()
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.assignment_submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = feedback.submission_id
        and a.created_by = auth.uid()
    )
  );

create policy "Students view feedback for their submissions"
  on public.feedback for select
  using (
    exists (
      select 1
      from public.assignment_submissions s
      where s.id = feedback.submission_id
        and s.student_id = auth.uid()
    )
  );
