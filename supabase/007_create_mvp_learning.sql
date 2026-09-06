create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (name, created_by)
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (class_id, student_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_by uuid references public.users(id) on delete set null
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  description text not null default '',
  unique (subject_id, name)
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  name text not null,
  description text not null default '',
  unique (topic_id, name)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  class_id uuid references public.classes(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  question_count integer not null default 0 check (question_count >= 0),
  due_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  position integer not null,
  type text not null check (type in ('multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer')),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb not null,
  explanation text not null default '',
  points integer not null default 1 check (points > 0),
  unique (assignment_id, position)
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz not null default timezone('utc', now()),
  attempt_number integer not null default 1 check (attempt_number > 0),
  unique (assignment_id, student_id, attempt_number)
);

create index if not exists assignments_class_idx on public.assignments (class_id, published, due_at);
create index if not exists submissions_student_idx on public.assignment_submissions (student_id, submitted_at desc);
create index if not exists submissions_assignment_idx on public.assignment_submissions (assignment_id, submitted_at desc);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.skills enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_submissions enable row level security;

create policy "Teachers manage their classes" on public.classes for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Members view their classes" on public.classes for select using (
  exists (select 1 from public.class_members where class_id = classes.id and student_id = auth.uid())
);
create policy "Teachers manage class members" on public.class_members for all using (
  exists (select 1 from public.classes where id = class_members.class_id and created_by = auth.uid())
) with check (
  exists (select 1 from public.classes where id = class_members.class_id and created_by = auth.uid())
);
create policy "Students view own membership" on public.class_members for select using (student_id = auth.uid());
create policy "Authenticated users view subjects" on public.subjects for select using (auth.uid() is not null);
create policy "Teachers manage subjects" on public.subjects for all using (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
) with check (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "Authenticated users view topics" on public.topics for select using (auth.uid() is not null);
create policy "Authenticated users view skills" on public.skills for select using (auth.uid() is not null);
create policy "Teachers manage topics" on public.topics for all using (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
) with check (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "Teachers manage skills" on public.skills for all using (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
) with check (
  exists (select 1 from public.users where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "Teachers manage assignments" on public.assignments for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Students view published assignments" on public.assignments for select using (
  published = true and exists (select 1 from public.class_members where class_id = assignments.class_id and student_id = auth.uid())
);
create policy "Assignment owners manage questions" on public.assignment_questions for all using (
  exists (select 1 from public.assignments where id = assignment_questions.assignment_id and created_by = auth.uid())
) with check (
  exists (select 1 from public.assignments where id = assignment_questions.assignment_id and created_by = auth.uid())
);
create policy "Students view assignment questions" on public.assignment_questions for select using (
  exists (
    select 1 from public.assignments a
    join public.class_members cm on cm.class_id = a.class_id
    where a.id = assignment_questions.assignment_id and a.published = true and cm.student_id = auth.uid()
  )
);
create policy "Students manage own submissions" on public.assignment_submissions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "Teachers view submissions" on public.assignment_submissions for select using (
  exists (select 1 from public.assignments where id = assignment_submissions.assignment_id and created_by = auth.uid())
);
