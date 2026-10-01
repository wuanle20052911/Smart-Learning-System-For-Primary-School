begin;

alter table public.assignments
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null;

alter table public.questions
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null;

alter table public.assignment_questions
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null;

update public.assignment_questions
set lesson_id = assignments.lesson_id
from public.assignments
where assignment_questions.assignment_id = assignments.id
  and assignment_questions.lesson_id is distinct from assignments.lesson_id;

create index if not exists assignments_lesson_idx
  on public.assignments (lesson_id, created_at desc);

create index if not exists questions_lesson_idx
  on public.questions (lesson_id, created_at desc);

create index if not exists assignment_questions_lesson_idx
  on public.assignment_questions (lesson_id, assignment_id);

commit;
