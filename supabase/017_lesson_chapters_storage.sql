alter table public.lessons
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists source_bucket text,
  add column if not exists source_path text;

create index if not exists lessons_topic_id_idx on public.lessons (topic_id, created_at desc);

insert into public.subjects (name)
select distinct trim(subject)
from public.lessons
where trim(coalesce(subject, '')) <> ''
on conflict (name) do nothing;

insert into public.topics (subject_id, name)
select distinct subjects.id, trim(lessons.topic)
from public.lessons
join public.subjects on lower(subjects.name) = lower(trim(lessons.subject))
where trim(coalesce(lessons.topic, '')) <> ''
on conflict (subject_id, name) do nothing;

update public.lessons
set topic_id = topics.id
from public.topics
join public.subjects on subjects.id = topics.subject_id
where lessons.topic_id is null
  and lower(topics.name) = lower(trim(lessons.topic))
  and lower(subjects.name) = lower(trim(lessons.subject));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials',
  'lesson-materials',
  false,
  6291456,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Teachers upload lesson materials" on storage.objects;
create policy "Teachers upload lesson materials"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('teacher', 'admin')
    )
  );

drop policy if exists "Read owned or published lesson materials" on storage.objects;
create policy "Read owned or published lesson materials"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-materials'
    and (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        and exists (
          select 1 from public.users
          where users.id = auth.uid() and users.role in ('teacher', 'admin')
        )
      )
      or exists (
        select 1 from public.lessons
        where lessons.source_bucket = 'lesson-materials'
          and lessons.source_path = storage.objects.name
          and lessons.published = true
      )
    )
  );

drop policy if exists "Teachers update own lesson materials" on storage.objects;
create policy "Teachers update own lesson materials"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'lesson-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('teacher', 'admin')
    )
  )
  with check (
    bucket_id = 'lesson-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Teachers delete own lesson materials" on storage.objects;
create policy "Teachers delete own lesson materials"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('teacher', 'admin')
    )
  );

drop policy if exists "Teachers read sample lesson buckets" on storage.objects;
create policy "Teachers read sample lesson buckets"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('Math4', 'Chapter1')
    and exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('teacher', 'admin')
    )
  );

drop policy if exists "Students read published sample lesson files" on storage.objects;
create policy "Students read published sample lesson files"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('Math4', 'Chapter1')
    and exists (
      select 1 from public.lessons
      where lessons.source_bucket = storage.objects.bucket_id
        and lessons.source_path = storage.objects.name
        and lessons.published = true
    )
  );