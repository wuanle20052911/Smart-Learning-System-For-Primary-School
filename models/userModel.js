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

async function registerStudent(email, password, fullName) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

module.exports = { signIn, registerStudent, createTeacher, updateProfile, getClass };
