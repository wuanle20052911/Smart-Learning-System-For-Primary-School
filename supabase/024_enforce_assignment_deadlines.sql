drop policy if exists "Students manage own submissions" on public.assignment_submissions;

create policy "Students view own submissions"
on public.assignment_submissions for select
using (student_id = auth.uid());

create policy "Students submit before deadline"
on public.assignment_submissions for insert
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    join public.class_members cm on cm.class_id = a.class_id
    where a.id = assignment_submissions.assignment_id
      and a.published = true
      and cm.student_id = auth.uid()
      and (a.due_at is null or a.due_at > now())
  )
);

create policy "Students update own submissions"
on public.assignment_submissions for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "Students delete own submissions"
on public.assignment_submissions for delete
using (student_id = auth.uid());
