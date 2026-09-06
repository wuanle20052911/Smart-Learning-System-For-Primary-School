alter table public.quiz_attempts
  add column if not exists questions jsonb not null default '[]'::jsonb,
  add column if not exists incorrect_answers jsonb not null default '[]'::jsonb;
