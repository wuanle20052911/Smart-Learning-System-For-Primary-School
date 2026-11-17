alter table public.lessons
  add column if not exists story_slides jsonb not null default '[]'::jsonb;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
where id = 'lesson-materials';

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
        select 1
        from public.lessons
        cross join lateral jsonb_array_elements(lessons.story_slides) as story_slide(value)
        where lessons.published = true
          and story_slide.value->>'path' = storage.objects.name
      )
      or exists (
        select 1 from public.lessons
        where lessons.source_bucket = 'lesson-materials'
          and lessons.source_path = storage.objects.name
          and lessons.published = true
      )
    )
  );
