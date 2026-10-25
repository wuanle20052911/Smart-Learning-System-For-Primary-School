const { getSupabaseAdminClient } = require('../models/supabaseAdminClient');

async function recordAIUsage(event) {
  const promptTokens = Math.max(0, Math.trunc(event.promptTokens || 0));
  const completionTokens = Math.max(0, Math.trunc(event.completionTokens || 0));
  const record = {
    user_id: event.userId || null,
    feature: event.feature,
    prompt_version: event.promptVersion,
    model: event.model || 'unknown',
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: Math.max(0, Math.trunc(event.latencyMs || 0)),
    tools: Array.isArray(event.tools) ? event.tools : [],
    status_code: Math.max(100, Math.trunc(event.statusCode || 500))
  };

  try {
    const { error } = await getSupabaseAdminClient().from('ai_usage_logs').insert(record);
    if (error) throw error;
  } catch (error) {
    console.error('Could not persist AI usage telemetry:', error);
  }
}

async function getAdminAIUsageSummary(days = 30) {
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdminClient()
    .rpc('admin_ai_usage_summary', { period_start: periodStart });
  if (error) throw new Error(`Không thể tải thống kê sử dụng AI: ${error.message}`);
  return data;
}

module.exports = { getAdminAIUsageSummary, recordAIUsage };
