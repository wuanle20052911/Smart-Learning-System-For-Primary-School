-- Supabase Auth stores credentials in auth.users.
-- This table stores application-specific profile data for each authenticated user.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);
create policy "Users can insert their own profile"
  on public.users for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    case
      when new.raw_user_meta_data->>'role' in ('teacher', 'admin')
        then new.raw_user_meta_data->>'role'
      else 'student'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
