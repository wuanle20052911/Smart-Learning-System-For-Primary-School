alter table public.lessons
  add column if not exists content text not null default '',
  add column if not exists source_filename text;
