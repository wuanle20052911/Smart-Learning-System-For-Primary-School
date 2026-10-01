drop policy if exists "Students practice questions from published lessons" on public.questions;

create policy "Students practice questions from published lessons"
  on public.questions for select
  using (
    exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role = 'student'
    )
    and exists (
      select 1
      from public.lessons
      where lessons.id = questions.lesson_id
        and lessons.published = true
    )
  );
