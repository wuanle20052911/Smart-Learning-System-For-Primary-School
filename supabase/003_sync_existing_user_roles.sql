-- Run this once after 001_create_users.sql to sync roles for accounts
-- that were registered before role support was added.
update public.users as profiles
set role = case
  when auth_users.raw_user_meta_data->>'role' in ('teacher', 'admin')
    then auth_users.raw_user_meta_data->>'role'
  else profiles.role
end,
updated_at = timezone('utc', now())
from auth.users as auth_users
where profiles.id = auth_users.id
  and auth_users.raw_user_meta_data->>'role' in ('teacher', 'admin');
