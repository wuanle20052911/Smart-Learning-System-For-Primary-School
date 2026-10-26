const { getSupabaseClient } = require('./supabaseClient');
const { getSupabaseAdminClient } = require('./supabaseAdminClient');

async function signIn(email, password) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await getSupabaseClient(data.session.access_token)
    .from('users')
    .select('id, email, full_name, gender, birth_date, avatar_url, role')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw profileError;

  data.profile = profile;
  return data;
}

async function updateProfile(accessToken, userId, profile) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('users')
    .update(profile)
    .eq('id', userId)
    .select('id, email, full_name, gender, birth_date, avatar_url, role')
    .single();
  if (error) throw error;
  return data;
}

async function getClass(accessToken, studentId) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('class_members')
    .select('classes(name, grade)')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.classes || null;
}

async function createTeacher(email, password, fullName) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error) throw error;

  const { data: profile, error: profileError } = await client
    .from('users')
    .update({ full_name: fullName, role: 'teacher' })
    .eq('id', data.user.id)
    .select('id, email, full_name, role')
    .single();
  if (profileError) {
    await client.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }
  return profile;
}

async function listManagedUsers() {
  const client = getSupabaseAdminClient();
  const perPage = 1000;
  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users || [];
    authUsers.push(...users);
    if (users.length < perPage) break;
  }
  if (!authUsers.length) return [];

  const profiles = [];
  for (let offset = 0; offset < authUsers.length; offset += 500) {
    const userIds = authUsers.slice(offset, offset + 500).map((user) => user.id);
    const { data, error } = await client
      .from('users')
      .select('id, email, full_name, role')
      .in('id', userIds)
      .in('role', ['student', 'teacher'])
      .order('full_name');
    if (error) throw error;
    profiles.push(...(data || []));
  }

  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  return profiles.map((profile) => {
    const authUser = authUserById.get(profile.id);
    const bannedUntil = authUser?.banned_until || null;
    return {
      ...profile,
      disabled: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
      banned_until: bannedUntil
    };
  });
}

async function setManagedUserDisabled(userId, disabled) {
  const client = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || !['student', 'teacher'].includes(profile.role)) {
    throw new Error('Không tìm thấy tài khoản học sinh hoặc giáo viên.');
  }

  const { data, error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? '876000h' : 'none'
  });
  if (error) throw error;
  const bannedUntil = data.user?.banned_until || null;
  return {
    ...profile,
    disabled: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
    banned_until: bannedUntil
  };
}

async function registerStudent(email, password, fullName) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

module.exports = { signIn, registerStudent, createTeacher, listManagedUsers, setManagedUserDisabled, updateProfile, getClass };
