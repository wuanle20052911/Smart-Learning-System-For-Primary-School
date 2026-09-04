const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng chức năng này.' });
  }

  try {
    const { data, error } = await getSupabaseClient().auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(500).json({ error: 'Không thể xác thực phiên đăng nhập.' });
  }
}

module.exports = requireAuth;
