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

alter table public.ai_usage_logs
  drop column if exists cost_usd;
