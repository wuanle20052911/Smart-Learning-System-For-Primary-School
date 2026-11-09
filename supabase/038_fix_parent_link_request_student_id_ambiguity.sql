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
    select 1 from public.users as u
    where u.id = p_parent_id and u.role = 'parent'
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
