const userModel = require('../models/userModel');

function normalizeProfile(body = {}) {
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const gender = typeof body.gender === 'string' ? body.gender.trim() : '';
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : '';
  const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
  if (fullName.length < 2 || fullName.length > 120) throw new Error('Họ tên phải có từ 2 đến 120 ký tự.');
  if (gender && !['male', 'female', 'other'].includes(gender)) throw new Error('Giới tính không hợp lệ.');
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error('Ngày sinh không hợp lệ.');
  if (avatarUrl && !/^\/public\/img\/avt\/[a-z0-9]+\.(?:png|jpe?g|webp|gif)$/i.test(avatarUrl)) {
    throw new Error('Avatar không hợp lệ.');
  }
  return { full_name: fullName, gender: gender || null, birth_date: birthDate || null, avatar_url: avatarUrl || null };
}

function validateCredentials(email, password) {
  if (!email || !password) return 'Email and password are required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (password.length < 6) return 'Password must contain at least 6 characters.';
  return null;
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const data = await userModel.signIn(email.trim().toLowerCase(), password);
    return res.json({ user: data.user, profile: data.profile, session: data.session });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unable to sign in.' });
  }
}

async function registerStudent(req, res) {
  const { email, password, fullName } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập họ tên học sinh.' });
  }

  try {
    const data = await userModel.registerStudent(email.trim().toLowerCase(), password, fullName.trim());
    return res.status(201).json({
      user: data.user,
      session: data.session,
      message: data.session ? 'Đăng ký học sinh thành công.' : 'Vui lòng kiểm tra email để xác nhận tài khoản.'
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Không thể đăng ký tài khoản học sinh.' });
  }
}

async function createTeacher(req, res) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản lý mới có quyền tạo tài khoản giáo viên.' });
  }

  const { email, password, fullName } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập họ tên giáo viên.' });
  }

  try {
    const teacher = await userModel.createTeacher(email.trim().toLowerCase(), password, fullName.trim());
    return res.status(201).json({ teacher, message: 'Đã tạo tài khoản giáo viên.' });
  } catch (error) {
    if (error.code === 'email_exists') {
      return res.status(409).json({ error: 'Email này đã được đăng ký. Vui lòng dùng email khác.' });
    }
    console.error('Could not create teacher account:', error);
    return res.status(400).json({ error: error.message || 'Không thể tạo tài khoản giáo viên.' });
  }
}

async function listManagedUsers(req, res) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản lý mới có quyền xem danh sách tài khoản.' });
  }
  try {
    return res.json({ users: await userModel.listManagedUsers() });
  } catch (error) {
    console.error('Could not list managed user accounts:', error);
    return res.status(500).json({ error: error.message || 'Không thể tải danh sách tài khoản.' });
  }
}

async function setManagedUserDisabled(req, res) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản lý mới có quyền khóa hoặc mở tài khoản.' });
  }
  if (typeof req.body?.disabled !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái tài khoản không hợp lệ.' });
  }
  try {
    const user = await userModel.setManagedUserDisabled(req.params.id, req.body.disabled);
    return res.json({ user });
  } catch (error) {
    console.error('Could not update managed user account status:', error);
    return res.status(400).json({ error: error.message || 'Không thể cập nhật trạng thái tài khoản.' });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await userModel.updateProfile(req.accessToken, req.user.id, normalizeProfile(req.body));
    return res.json({ profile });
  } catch (error) {
    console.error('Could not update profile:', error);
    return res.status(400).json({ error: error.message || 'Không thể cập nhật thông tin cá nhân.' });
  }
}

async function getProfile(req, res) {
  try {
    return res.json({ profile: req.profile, class: await userModel.getClass(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not load profile details:', error);
    return res.status(500).json({ error: 'Không thể tải thông tin cá nhân.' });
  }
}

function getOAuthConfig(req, res) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Đăng nhập Google chưa được cấu hình trên máy chủ.' });
  }
  res.set('Cache-Control', 'no-store');
  return res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
}

module.exports = { login, registerStudent, createTeacher, listManagedUsers, setManagedUserDisabled, updateProfile, getProfile, getOAuthConfig };
