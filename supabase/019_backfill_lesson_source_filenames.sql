-- Fill missing display filenames from the existing chapter Storage object path.
-- Existing source_filename values are preserved; this can be run repeatedly.
update public.lessons
set source_filename = regexp_replace(source_path, '^.*/', '')
where source_bucket in ('Chapter1', 'Chapter2', 'Chapter3')
  and nullif(trim(source_path), '') is not null
  and nullif(trim(source_filename), '') is null;