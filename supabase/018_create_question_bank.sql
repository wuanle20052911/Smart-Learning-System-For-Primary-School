create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_id bigint generated always as identity unique,
  question_key text not null unique default ('Q-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  created_by uuid not null references public.users(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  type text not null check (type in ('multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer')),
  content text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb not null,
  explanation text not null default '',
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists questions_owner_idx
  on public.questions (created_by, updated_at desc);

alter table public.questions enable row level security;

create policy "Teachers manage their questions"
  on public.questions for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
