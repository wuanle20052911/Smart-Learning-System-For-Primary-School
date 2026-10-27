const { getSupabaseAdminClient } = require('../models/supabaseAdminClient');

const SETTING_KEY = 'ai_features_enabled';

async function getAIFeaturesEnabled() {
  const { data, error } = await getSupabaseAdminClient()
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', SETTING_KEY)
    .single();
  if (error) throw new Error(`Không thể đọc cài đặt AI: ${error.message}`);
  if (typeof data?.setting_value?.enabled !== 'boolean') {
    throw new Error('Cài đặt bật/tắt AI chưa được khởi tạo. Hãy chạy migration Supabase mới nhất.');
  }
  return data.setting_value.enabled;
}

async function setAIFeaturesEnabled(enabled, updatedBy) {
  const { data, error } = await getSupabaseAdminClient()
    .from('app_settings')
    .upsert({
      setting_key: SETTING_KEY,
      setting_value: { enabled },
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' })
    .select('setting_value')
    .single();
  if (error) throw new Error(`Không thể cập nhật cài đặt AI: ${error.message}`);
  return data.setting_value.enabled;
}

module.exports = { getAIFeaturesEnabled, setAIFeaturesEnabled };
