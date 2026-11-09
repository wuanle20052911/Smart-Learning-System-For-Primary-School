alter table public.users
  add column if not exists phone_number text;

alter table public.users
  drop constraint if exists users_parent_phone_number_check;

alter table public.users
  add constraint users_parent_phone_number_check
  check (
    phone_number is null
    or (role = 'parent' and phone_number ~ '^\+84[35789][0-9]{8}$')
  );

create unique index if not exists users_parent_phone_number_unique
  on public.users (phone_number)
  where role = 'parent' and phone_number is not null;

grant update (phone_number) on public.users to authenticated;

create table if not exists public.parent_link_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (parent_id <> student_id)
);

create unique index if not exists parent_link_requests_pending_pair_unique
  on public.parent_link_requests (student_id, parent_id)
  where status = 'pending';

create index if not exists parent_link_requests_parent_status_idx
  on public.parent_link_requests (parent_id, status, created_at desc);

create index if not exists parent_link_requests_student_created_idx
  on public.parent_link_requests (student_id, created_at desc);

alter table public.parent_link_requests enable row level security;
revoke all on public.parent_link_requests from public, anon, authenticated;
grant select, insert, update, delete on public.parent_link_requests to service_role;

create or replace function public.respond_to_parent_link_request(
  p_parent_id uuid,
  p_request_id uuid,
  p_action text
)
returns table (request_id uuid, student_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.parent_link_requests%rowtype;
  next_status text;
begin
  if p_action is null or p_action not in ('accept', 'reject') then
    raise exception 'Invalid request action' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users
    where id = p_parent_id and role = 'parent'
  ) then
    raise exception 'Parent account not found' using errcode = '42501';
  end if;

  select plr.* into request_row
  from public.parent_link_requests as plr
  where plr.id = p_request_id
    and plr.parent_id = p_parent_id
    and plr.status = 'pending'
  for update of plr;

  if not found then
    raise exception 'Pending request not found' using errcode = 'P0002';
  end if;

  next_status := case when p_action = 'accept' then 'accepted' else 'rejected' end;

  if p_action = 'accept' then
    insert into public.parent_student_links (parent_id, student_id, linked_by)
    values (p_parent_id, request_row.student_id, null)
    on conflict on constraint parent_student_links_pkey do nothing;
  end if;

  update public.parent_link_requests as plr
  set status = next_status, updated_at = timezone('utc', now())
  where plr.id = request_row.id;

  return query select request_row.id, request_row.student_id, next_status;
end;
$$;

revoke all on function public.respond_to_parent_link_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_parent_link_request(uuid, uuid, text)
  to service_role;
