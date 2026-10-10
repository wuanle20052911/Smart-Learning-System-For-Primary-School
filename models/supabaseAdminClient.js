const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdminClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY để thao tác quản trị an toàn trên Supabase.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

module.exports = { getSupabaseAdminClient };
