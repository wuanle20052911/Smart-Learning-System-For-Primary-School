begin;

insert into public.subjects (name)
select distinct trim(lessons.subject)
from public.lessons
where trim(coalesce(lessons.subject, '')) <> ''
  and not exists (
    select 1
    from public.subjects
    where lower(trim(subjects.name)) = lower(trim(lessons.subject))
  )
on conflict (name) do nothing;

insert into public.topics (subject_id, name)
select distinct subject_match.id, trim(lessons.topic)
from public.lessons
cross join lateral (
  select subjects.id
  from public.subjects
  where lower(trim(subjects.name)) = lower(trim(lessons.subject))
  order by (trim(subjects.name) = trim(lessons.subject)) desc, subjects.id
  limit 1
) as subject_match
where trim(coalesce(lessons.subject, '')) <> ''
  and trim(coalesce(lessons.topic, '')) <> ''
  and not exists (
    select 1
    from public.topics
    where topics.subject_id = subject_match.id
      and lower(trim(topics.name)) = lower(trim(lessons.topic))
  )
on conflict (subject_id, name) do nothing;

with lesson_topic_matches as (
  select lessons.id as lesson_id, topic_match.id as topic_id
  from public.lessons
  cross join lateral (
    select subjects.id
    from public.subjects
    where lower(trim(subjects.name)) = lower(trim(lessons.subject))
    order by (trim(subjects.name) = trim(lessons.subject)) desc, subjects.id
    limit 1
  ) as subject_match
  cross join lateral (
    select topics.id
    from public.topics
    where topics.subject_id = subject_match.id
      and lower(trim(topics.name)) = lower(trim(lessons.topic))
    order by (trim(topics.name) = trim(lessons.topic)) desc, topics.id
    limit 1
  ) as topic_match
  where trim(coalesce(lessons.subject, '')) <> ''
    and trim(coalesce(lessons.topic, '')) <> ''
)
update public.lessons
set topic_id = lesson_topic_matches.topic_id
from lesson_topic_matches
where lessons.id = lesson_topic_matches.lesson_id
  and lessons.topic_id is distinct from lesson_topic_matches.topic_id;

commit;
