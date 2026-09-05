const { getSupabaseClient } = require('../models/supabaseClient');

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng chức năng này.' });
  }

  try {
    const client = getSupabaseClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    const { data: profile, error: profileError } = await client
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', data.user.id)
      .single();
    if (profileError) {
      console.error('Profile lookup failed:', profileError);
      return res.status(403).json({ error: 'Không tìm thấy hồ sơ người dùng.' });
    }

    req.user = data.user;
    req.profile = profile;
    req.accessToken = token;
    return next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(500).json({ error: 'Không thể xác thực phiên đăng nhập.' });
  }
}

module.exports = requireAuth;
