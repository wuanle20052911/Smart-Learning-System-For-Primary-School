const { getSupabaseClient } = require('./supabaseClient');

async function signIn(email, password) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await getSupabaseClient(data.session.access_token)
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .single();
  if (profileError) throw profileError;

  data.profile = profile;
  return data;
}

async function register(email, password, fullName, role = 'student') {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } }
  });
  if (error) throw error;
  return data;
}

module.exports = { signIn, register };
