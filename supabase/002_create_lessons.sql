create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  description text not null default '',
  subject text not null default 'Toán',
  grade text not null default 'Tiểu học',
  topic text not null default '',
  content text not null default '',
  source_filename text,
  icon text not null default '📚',
  color text not null default 'blue' check (color in ('blue', 'yellow', 'green', 'pink')),
  published boolean not null default false,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lessons_published_idx on public.lessons (published, created_at desc);
create index if not exists lessons_created_by_idx on public.lessons (created_by, updated_at desc);

alter table public.lessons enable row level security;

create policy "Anyone can view published lessons"
  on public.lessons for select using (published = true or auth.uid() = created_by);
create policy "Teachers can create lessons"
  on public.lessons for insert with check (
    auth.uid() = created_by
    and exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
  );
create policy "Teachers can update their lessons"
  on public.lessons for update using (
    auth.uid() = created_by
    and exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
  );
create policy "Teachers can delete their lessons"
  on public.lessons for delete using (
    auth.uid() = created_by
    and exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
  );
