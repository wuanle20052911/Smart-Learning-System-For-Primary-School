create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (setting_key, setting_value)
values ('ai_features_enabled', '{"enabled": true}'::jsonb)
on conflict (setting_key) do nothing;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from public, anon, authenticated;
grant all on public.app_settings to service_role;
