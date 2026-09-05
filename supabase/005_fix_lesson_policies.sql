-- Recreate lesson policies so existing databases accept both metadata and
-- extracted document content on insert/update.
drop policy if exists "Anyone can view published lessons" on public.lessons;
drop policy if exists "Teachers can create lessons" on public.lessons;
drop policy if exists "Teachers can update their lessons" on public.lessons;
drop policy if exists "Teachers can delete their lessons" on public.lessons;

create policy "Anyone can view published lessons"
  on public.lessons for select using (published = true or auth.uid() = created_by);

create policy "Teachers can create lessons"
  on public.lessons for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

create policy "Teachers can update their lessons"
  on public.lessons for update
  using (
    auth.uid() = created_by
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  )
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

create policy "Teachers can delete their lessons"
  on public.lessons for delete
  using (
    auth.uid() = created_by
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );
