const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Thay Supabase client bằng bản giả đếm số lượt gọi.
const calls = { getUser: 0, profile: 0 };
let banned = new Set();
const clientPath = path.join(__dirname, '..', 'models', 'supabaseClient.js');
require.cache[clientPath] = {
  id: clientPath, filename: clientPath, loaded: true,
  exports: {
    getSupabaseClient: () => ({
      auth: {
        getUser: async (token) => {
          calls.getUser += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          if (token === 'bad' || banned.has(token)) return { data: { user: null }, error: new Error('invalid') };
          return { data: { user: { id: `user-${token}` } }, error: null };
        }
      },
      from: () => ({
        select: () => ({ eq: (_, id) => ({ single: async () => { calls.profile += 1; return { data: { id, role: 'student' }, error: null }; } }) })
      })
    })
  }
};
const requireAuth = require('../middleware/requireAuth');
const { clearAuthCache } = requireAuth;

function run(token) {
  return new Promise((resolve) => {
    const req = { get: () => (token ? `Bearer ${token}` : '') };
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, body, req }); } };
    requireAuth(req, res, () => resolve({ code: 200, req }));
  });
}

test('parallel and repeated requests with one token hit Supabase once', async () => {
  clearAuthCache();
  calls.getUser = 0; calls.profile = 0;
  const results = await Promise.all([run('a'), run('a'), run('a')]);
  const again = await run('a');
  assert.deepEqual([...results, again].map((item) => item.code), [200, 200, 200, 200]);
  assert.equal(again.req.user.id, 'user-a');
  assert.equal(again.req.profile.role, 'student');
  assert.equal(again.req.accessToken, 'a');
  assert.equal(calls.getUser, 1);
  assert.equal(calls.profile, 1);
});

test('invalid tokens are rejected and never cached', async () => {
  clearAuthCache();
  calls.getUser = 0;
  assert.equal((await run('bad')).code, 401);
  assert.equal((await run('bad')).code, 401);
  assert.equal(calls.getUser, 2);
  assert.equal((await run('')).code, 401);
});

test('clearing a user forces a fresh check, so a locked account is refused', async () => {
  clearAuthCache();
  assert.equal((await run('b')).code, 200);
  banned.add('b');
  assert.equal((await run('b')).code, 200, 'still served from cache before clearing');
  clearAuthCache('user-b');
  assert.equal((await run('b')).code, 401);
  banned = new Set();
});
