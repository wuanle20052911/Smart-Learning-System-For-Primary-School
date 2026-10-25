const test = require('node:test');
const assert = require('node:assert/strict');
const { getOAuthConfig } = require('../controllers/authController');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('OAuth config returns only the public Supabase client settings', (t) => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousAnonKey = process.env.SUPABASE_ANON_KEY;
  t.after(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousAnonKey;
  });

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-anon-key';
  const response = createResponse();

  getOAuthConfig({}, response);

  assert.deepEqual(response.body, {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'public-anon-key'
  });
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('OAuth config reports missing server configuration', (t) => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousAnonKey = process.env.SUPABASE_ANON_KEY;
  t.after(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousAnonKey;
  });

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const response = createResponse();

  getOAuthConfig({}, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { error: 'Đăng nhập Google chưa được cấu hình trên máy chủ.' });
});
