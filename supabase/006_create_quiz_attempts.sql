create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  student_name text not null default '',
  student_email text not null default '',
  title text not null,
  grade text not null default 'Tiểu học',
  chapter text not null default 'Luyện tập nhanh',
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  questions jsonb not null default '[]'::jsonb,
  incorrect_answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint quiz_attempts_score_limit check (score <= total)
);

create index if not exists quiz_attempts_student_idx
  on public.quiz_attempts (student_id, created_at desc);
create index if not exists quiz_attempts_lesson_idx
  on public.quiz_attempts (lesson_id, created_at desc);

alter table public.quiz_attempts enable row level security;

create policy "Students can view their own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = student_id);

create policy "Students can create their own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = student_id);

create policy "Teachers can view attempts for their lessons"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.lessons
      where lessons.id = quiz_attempts.lesson_id
        and lessons.created_by = auth.uid()
    )
    or exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
