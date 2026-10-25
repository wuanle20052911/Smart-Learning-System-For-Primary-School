import { createClient } from '@supabase/supabase-js';

let supabaseClientPromise;

async function getSupabaseAuthClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = fetch('/api/auth/config')
      .then(async (response) => {
        const config = await response.json();
        if (!response.ok) throw new Error(config.error || 'Không thể tải cấu hình đăng nhập.');
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
          throw new Error('Cấu hình đăng nhập Google không hợp lệ.');
        }

        return createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true }
        });
      })
      .catch((error) => {
        supabaseClientPromise = null;
        throw error;
      });
  }
  return supabaseClientPromise;
}

export async function signInWithGoogle() {
  const client = await getSupabaseAuthClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
}

export async function completeGoogleSignIn() {
  const client = await getSupabaseAuthClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Không tìm thấy phiên đăng nhập Google. Vui lòng thử lại.');
  return data.session;
}

export async function signOutGoogleSession() {
  if (!supabaseClientPromise) return;
  const client = await supabaseClientPromise;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
