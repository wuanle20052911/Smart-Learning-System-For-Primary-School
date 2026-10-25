create table if not exists public.student_lesson_completions (
  student_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  points integer not null default 10 check (points = 10),
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, lesson_id)
);

create index if not exists student_lesson_completions_student_idx
  on public.student_lesson_completions (student_id);

alter table public.student_lesson_completions enable row level security;
revoke all on table public.student_lesson_completions from anon, authenticated;

create or replace function public.award_student_lesson_points(target_lesson_id uuid)
returns table(total_points bigint, total_lessons bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_id uuid := auth.uid();
begin
  if current_student_id is null or not exists (
    select 1 from public.users
    where id = current_student_id and role = 'student'
  ) then
    raise exception 'Chỉ học sinh đã đăng nhập mới được ghi nhận điểm.';
  end if;

  if not exists (
    select 1 from public.lessons
    where id = target_lesson_id and published = true
  ) then
    raise exception 'Không tìm thấy bài học đã xuất bản.';
  end if;

  insert into public.student_lesson_completions (student_id, lesson_id)
  values (current_student_id, target_lesson_id)
  on conflict (student_id, lesson_id) do nothing;

  return query
  select
    coalesce(sum(completion.points), 0)::bigint,
    count(*)::bigint
  from public.student_lesson_completions as completion
  where completion.student_id = current_student_id;
end;
$$;

revoke all on function public.award_student_lesson_points(uuid) from public;
grant execute on function public.award_student_lesson_points(uuid) to authenticated;

create or replace function public.get_student_class_leaderboard()
returns table(
  student_id uuid,
  student_name text,
  points bigint,
  completed_lessons bigint,
  rank_position bigint,
  class_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_id uuid := auth.uid();
  current_class_id uuid;
begin
  if current_student_id is null or not exists (
    select 1 from public.users
    where id = current_student_id and role = 'student'
  ) then
    raise exception 'Bảng xếp hạng chỉ dành cho học sinh.';
  end if;

  select membership.class_id into current_class_id
  from public.class_members as membership
  where membership.student_id = current_student_id
  order by membership.joined_at, membership.class_id
  limit 1;

  if current_class_id is null then
    return;
  end if;

  return query
  with class_scores as (
    select
      membership.student_id as ranked_student_id,
      profile.full_name as ranked_student_name,
      coalesce(sum(completion.points), 0)::bigint as ranked_points,
      count(completion.lesson_id)::bigint as ranked_completed_lessons
    from public.class_members as membership
    join public.users as profile
      on profile.id = membership.student_id
      and profile.role = 'student'
    left join public.student_lesson_completions as completion
      on completion.student_id = membership.student_id
    where membership.class_id = current_class_id
    group by membership.student_id, profile.full_name
  ),
  ranked_students as (
    select
      class_scores.ranked_student_id,
      class_scores.ranked_student_name,
      class_scores.ranked_points,
      class_scores.ranked_completed_lessons,
      row_number() over (
        order by class_scores.ranked_points desc, class_scores.ranked_student_name, class_scores.ranked_student_id
      ) as student_position
    from class_scores
  )
  select
    ranked_students.ranked_student_id,
    ranked_students.ranked_student_name,
    ranked_students.ranked_points,
    ranked_students.ranked_completed_lessons,
    ranked_students.student_position,
    class_record.name
  from ranked_students
  cross join public.classes as class_record
  where class_record.id = current_class_id
  order by ranked_students.student_position;
end;
$$;

revoke all on function public.get_student_class_leaderboard() from public;
grant execute on function public.get_student_class_leaderboard() to authenticated;
