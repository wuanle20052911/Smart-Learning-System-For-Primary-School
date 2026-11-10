alter table public.ai_usage_logs
  drop constraint if exists ai_usage_logs_feature_check;

alter table public.ai_usage_logs
  add constraint ai_usage_logs_feature_check
  check (feature in ('ai-chat', 'quiz-generation', 'study-plan'));
