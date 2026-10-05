create table if not exists public.risk_alerts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  risk_level text not null check (risk_level in ('Cao', 'Theo dõi')),
  risk_score numeric(5,2),
  reason text not null,
  indicators jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'resolved')),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'active' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create unique index if not exists risk_alerts_one_active_per_student_teacher
  on public.risk_alerts (teacher_id, student_id)
  where status = 'active';

create index if not exists risk_alerts_teacher_history_idx
  on public.risk_alerts (teacher_id, status, last_seen_at desc);

alter table public.risk_alerts enable row level security;

drop policy if exists "Teachers manage their risk alerts" on public.risk_alerts;
create policy "Teachers manage their risk alerts"
  on public.risk_alerts for all
  using (
    teacher_id = auth.uid()
    and public.is_teacher_or_admin()
  )
  with check (
    teacher_id = auth.uid()
    and public.is_teacher_or_admin()
  );
