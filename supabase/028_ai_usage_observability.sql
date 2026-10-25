create table if not exists public.ai_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null check (feature in ('ai-chat', 'quiz-generation')),
  prompt_version text not null,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  tools jsonb not null default '[]'::jsonb,
  status_code integer not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_created_at_idx
  on public.ai_usage_logs (created_at desc);

alter table public.ai_usage_logs enable row level security;
revoke all on public.ai_usage_logs from anon, authenticated;
grant all on public.ai_usage_logs to service_role;
grant usage, select on sequence public.ai_usage_logs_id_seq to service_role;

create or replace function public.admin_ai_usage_summary(period_start timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'requestCount', count(*),
    'successfulRequestCount', count(*) filter (where status_code < 400),
    'failedRequestCount', count(*) filter (where status_code >= 400),
    'promptTokens', coalesce(sum(prompt_tokens), 0),
    'completionTokens', coalesce(sum(completion_tokens), 0),
    'averageLatencyMs', coalesce(avg(latency_ms), 0),
    'recentRequests', coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.created_at desc)
      from (
        select feature, prompt_version, model, prompt_tokens, completion_tokens,
          latency_ms, tools, status_code, created_at
        from public.ai_usage_logs
        where created_at >= period_start
        order by created_at desc
        limit 10
      ) as recent
    ), '[]'::jsonb)
  )
  from public.ai_usage_logs
  where created_at >= period_start;
$$;

revoke all on function public.admin_ai_usage_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_ai_usage_summary(timestamptz) to service_role;
