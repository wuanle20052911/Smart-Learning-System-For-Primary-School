-- Tin nhắn hai chiều giữa phụ huynh và giáo viên, theo từng học sinh.
-- Mỗi cuộc trò chuyện = (học sinh, phụ huynh, giáo viên). Server (service role) kiểm tra
-- phụ huynh đã liên kết với học sinh và giáo viên đang dạy lớp của học sinh trước khi đọc/ghi.
create table if not exists public.parent_teacher_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.users(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  check (sender_id = parent_id or sender_id = teacher_id),
  check (parent_id <> teacher_id)
);

create index if not exists parent_teacher_messages_thread_idx
  on public.parent_teacher_messages (student_id, parent_id, teacher_id, created_at desc);

create index if not exists parent_teacher_messages_parent_idx
  on public.parent_teacher_messages (parent_id, created_at desc);

create index if not exists parent_teacher_messages_teacher_idx
  on public.parent_teacher_messages (teacher_id, created_at desc);

create index if not exists parent_teacher_messages_unread_idx
  on public.parent_teacher_messages (parent_id, teacher_id)
  where read_at is null;

alter table public.parent_teacher_messages enable row level security;
revoke all on public.parent_teacher_messages from public, anon, authenticated;
grant select, insert, update, delete on public.parent_teacher_messages to service_role;
