alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('student', 'parent', 'teacher', 'admin'));

revoke update on public.users from public, anon, authenticated;
grant update (full_name, gender, birth_date, avatar_url) on public.users to authenticated;

create table if not exists public.parent_student_links (
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  linked_by uuid references public.users(id) on delete set null,
  linked_at timestamptz not null default timezone('utc', now()),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);

create index if not exists parent_student_links_student_idx
  on public.parent_student_links (student_id, linked_at desc);

alter table public.parent_student_links enable row level security;

revoke all on public.parent_student_links from anon;
grant select, insert, delete on public.parent_student_links to authenticated;

drop policy if exists "Parents and students can view their links" on public.parent_student_links;
create policy "Parents and students can view their links"
  on public.parent_student_links for select
  using (auth.uid() = parent_id or auth.uid() = student_id);

drop policy if exists "Admins can manage parent student links" on public.parent_student_links;
create policy "Admins can manage parent student links"
  on public.parent_student_links for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
