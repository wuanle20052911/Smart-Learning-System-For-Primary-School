const { getSupabaseClient } = require('../models/supabaseClient');

// Mỗi lần kiểm tra phiên cần 2 lượt gọi Supabase (xác thực token + đọc hồ sơ).
// Trang học sinh gọi 3–4 API cùng lúc, nên nhớ kết quả ngắn hạn theo token để chỉ hỏi Supabase
// khoảng một lần mỗi phút cho mỗi phiên đăng nhập.
const SESSION_TTL_MS = 60 * 1000;
const MAX_CACHED_SESSIONS = 1000;
const sessions = new Map();
const pending = new Map();

function readCached(token, now = Date.now()) {
  const entry = sessions.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    sessions.delete(token);
    return null;
  }
  return entry;
}

function remember(token, entry) {
  if (sessions.size >= MAX_CACHED_SESSIONS) sessions.delete(sessions.keys().next().value);
  sessions.set(token, entry);
}

// Gọi khi hồ sơ hoặc trạng thái tài khoản thay đổi để lần gọi sau đọc lại từ Supabase.
function clearAuthCache(userId) {
  if (!userId) {
    sessions.clear();
    return;
  }
  for (const [token, entry] of sessions) {
    if (entry.user.id === userId) sessions.delete(token);
  }
}

async function lookupSession(token) {
  const client = getSupabaseClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { status: 401, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' };

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id, email, full_name, gender, birth_date, avatar_url, phone_number, role')
    .eq('id', data.user.id)
    .single();
  if (profileError) {
    console.error('Profile lookup failed:', profileError);
    if (['42703', 'PGRST204'].includes(profileError.code) && /phone_number/i.test(profileError.message || '')) {
      return { status: 503, error: 'Quản trị viên cần chạy migration supabase/036_parent_phone_link_requests.sql trước khi sử dụng ứng dụng.' };
    }
    return { status: 403, error: 'Không tìm thấy hồ sơ người dùng.' };
  }
  return { user: data.user, profile };
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng chức năng này.' });
  }

  try {
    let session = readCached(token);
    if (!session) {
      // Các API gọi song song với cùng token dùng chung một lượt kiểm tra.
      let lookup = pending.get(token);
      if (!lookup) {
        lookup = lookupSession(token).finally(() => pending.delete(token));
        pending.set(token, lookup);
      }
      const result = await lookup;
      if (result.error) return res.status(result.status).json({ error: result.error });
      session = readCached(token) || { user: result.user, profile: result.profile, expiresAt: Date.now() + SESSION_TTL_MS };
      remember(token, session);
    }

    req.user = session.user;
    req.profile = session.profile;
    req.accessToken = token;
    return next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(500).json({ error: 'Không thể xác thực phiên đăng nhập.' });
  }
}

module.exports = requireAuth;
module.exports.clearAuthCache = clearAuthCache;
