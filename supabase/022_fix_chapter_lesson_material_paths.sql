begin;

with lesson_file_corrections as (
  select
    lessons.id,
    case
      when lessons.source_path ~ '(^|/)C2B([4-6])(\.docx)$'
        then regexp_replace(lessons.source_path, '(^|/)C2B([4-6])(\.docx)$', '\1C1B\2\3')
      else regexp_replace(lessons.source_filename, '^C2B([4-6])(\.docx)$', 'C1B\1\2')
    end as corrected_path,
    regexp_replace(
      coalesce(nullif(trim(lessons.source_filename), ''), regexp_replace(lessons.source_path, '^.*/', '')),
      '^C2B([4-6])(\.docx)$',
      'C1B\1\2'
    ) as corrected_filename
  from public.lessons
  where lessons.source_bucket in ('Chapter1', 'Chapter2', 'Chapter3')
    and (
      lessons.source_path ~ '(^|/)C2B[4-6](\.docx)$'
      or lessons.source_filename ~ '^C2B[4-6](\.docx)$'
    )
)
update public.lessons
set source_bucket = 'Chapter1',
    source_path = lesson_file_corrections.corrected_path,
    source_filename = lesson_file_corrections.corrected_filename
from lesson_file_corrections
where public.lessons.id = lesson_file_corrections.id
  and exists (
    select 1
    from storage.objects
    where storage.objects.bucket_id = 'Chapter1'
      and storage.objects.name = lesson_file_corrections.corrected_path
  );

commit;
