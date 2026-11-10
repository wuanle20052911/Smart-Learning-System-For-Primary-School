const test = require('node:test');
const assert = require('node:assert/strict');
const userModel = require('../models/userModel');
const parentModel = require('../models/parentModel');
const {
  dashboard, parentOnly, studentOnly, createLink, createRequest, respondToRequest
} = require('../controllers/parentController');
const { login, registerParent, updateProfile } = require('../controllers/authController');

function createResponse() {
  return {
    statusCode: 200,
    set() {
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('parent dashboard authorization denies other roles and scopes data to the signed-in parent', async (t) => {
  const originalDashboard = parentModel.getDashboard;
  t.after(() => { parentModel.getDashboard = originalDashboard; });
  const parentIds = [];
  parentModel.getDashboard = async (parentId) => {
    parentIds.push(parentId);
    return { children: [] };
  };

  const denied = createResponse();
  let nextCalled = false;
  parentOnly({ profile: { role: 'student' } }, denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  const allowed = createResponse();
  await dashboard({ user: { id: 'parent-1' }, body: { parent_id: 'other-parent' } }, allowed);
  assert.deepEqual(allowed.body, { children: [] });
  assert.deepEqual(parentIds, ['parent-1']);
});

test('parent-student links require admin authorization and valid account identifiers', async (t) => {
  const originalCreateLink = parentModel.createLink;
  t.after(() => { parentModel.createLink = originalCreateLink; });
  const calls = [];
  parentModel.createLink = async (...args) => {
    calls.push(args);
    return { parent_id: args[1], student_id: args[2] };
  };

  const denied = createResponse();
  let nextCalled = false;
  const { adminOnly } = require('../controllers/parentController');
  adminOnly({ profile: { role: 'teacher' } }, denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  const invalid = createResponse();
  await createLink({ user: { id: 'admin-1' }, body: { parent_id: 'bad', student_id: 'bad' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const created = createResponse();
  await createLink({
    user: { id: 'admin-1' },
    body: {
      parent_id: '123e4567-e89b-42d3-a456-426614174000',
      student_id: '123e4567-e89b-42d3-a456-426614174001'
    }
  }, created);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(calls, [[
    'admin-1',
    '123e4567-e89b-42d3-a456-426614174000',
    '123e4567-e89b-42d3-a456-426614174001'
  ]]);
});

test('parent registration validates the profile and creates a parent-role account', async (t) => {
  const originalRegister = userModel.registerParent;
  t.after(() => { userModel.registerParent = originalRegister; });
  const calls = [];
  userModel.registerParent = async (...args) => {
    calls.push(args);
    return { user: { id: 'parent-1' }, profile: { id: 'parent-1', role: 'parent' }, session: null };
  };

  const invalid = createResponse();
  await registerParent({ body: { fullName: 'A', email: 'parent@example.com', password: 'secret1' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const created = createResponse();
  await registerParent({
    body: { fullName: 'Nguyễn Thị Lan', email: ' PARENT@EXAMPLE.COM ', password: 'secret1' }
  }, created);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(calls, [['parent@example.com', 'secret1', 'Nguyễn Thị Lan']]);
  assert.equal(created.body.profile.role, 'parent');
});

test('parent registration explains when the database migration is missing', async (t) => {
  const originalRegister = userModel.registerParent;
  t.after(() => { userModel.registerParent = originalRegister; });
  userModel.registerParent = async () => {
    const error = new Error('check constraint violation');
    error.code = '23514';
    error.constraint = 'users_role_check';
    throw error;
  };

  const response = createResponse();
  await registerParent({
    body: { fullName: 'Nguyễn Thị Lan', email: 'parent@example.com', password: 'secret1' }
  }, response);
  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /supabase\/035_parent_portal\.sql/);
});

test('parent registration reports Supabase email rate limits as a temporary issue', async (t) => {
  const originalRegister = userModel.registerParent;
  t.after(() => { userModel.registerParent = originalRegister; });
  userModel.registerParent = async () => {
    const error = new Error('email rate limit exceeded');
    error.code = 'over_email_send_rate_limit';
    throw error;
  };

  const response = createResponse();
  await registerParent({
    body: { fullName: 'Nguyễn Thị Lan', email: 'parent@example.com', password: 'secret1' }
  }, response);
  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /SMTP riêng/);
});

test('login explains when the parent phone migration has not been applied', async (t) => {
  const originalSignIn = userModel.signIn;
  t.after(() => { userModel.signIn = originalSignIn; });
  userModel.signIn = async () => {
    const error = new Error('column phone_number does not exist');
    error.code = '42703';
    throw error;
  };

  const response = createResponse();
  await login({ body: { email: 'parent@example.com', password: 'secret1' } }, response);
  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /036_parent_phone_link_requests\.sql/);
});

test('only students can create parent link requests and phone numbers are normalized', async (t) => {
  const originalCreateRequest = parentModel.createLinkRequest;
  t.after(() => { parentModel.createLinkRequest = originalCreateRequest; });
  const calls = [];
  parentModel.createLinkRequest = async (...args) => {
    calls.push(args);
    return { id: 'request-1', status: 'pending' };
  };

  const denied = createResponse();
  let nextCalled = false;
  studentOnly({ profile: { role: 'parent' } }, denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  const invalid = createResponse();
  await createRequest({ user: { id: 'student-1' }, body: { phoneNumber: '12345' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const sent = createResponse();
  await createRequest({ user: { id: 'student-1' }, body: { phoneNumber: '090 123 4567' } }, sent);
  assert.equal(sent.statusCode, 201);
  assert.deepEqual(calls, [['student-1', '+84901234567']]);
});

test('student link request explains when the phone is not registered to a parent', async (t) => {
  const originalCreateRequest = parentModel.createLinkRequest;
  t.after(() => { parentModel.createLinkRequest = originalCreateRequest; });
  parentModel.createLinkRequest = async () => {
    const error = new Error('No matching parent');
    error.code = 'PARENT_NOT_FOUND';
    throw error;
  };

  const response = createResponse();
  await createRequest({ user: { id: 'student-1' }, body: { phoneNumber: '0912345678' } }, response);
  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /cập nhật số điện thoại trong hồ sơ/);
});

test('parent request decisions are validated and scoped to the signed-in parent', async (t) => {
  const originalRespond = parentModel.respondToRequest;
  t.after(() => { parentModel.respondToRequest = originalRespond; });
  const calls = [];
  parentModel.respondToRequest = async (...args) => {
    calls.push(args);
    return { request_id: args[1], status: args[2] === 'accept' ? 'accepted' : 'rejected' };
  };

  const invalid = createResponse();
  await respondToRequest({ params: { requestId: 'not-a-uuid' }, body: { action: 'accept' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const accepted = createResponse();
  await respondToRequest({
    user: { id: 'parent-1' },
    params: { requestId: '123e4567-e89b-42d3-a456-426614174000' },
    body: { action: 'accept' }
  }, accepted);
  assert.equal(accepted.body.request.status, 'accepted');
  assert.deepEqual(calls, [['parent-1', '123e4567-e89b-42d3-a456-426614174000', 'accept']]);
});

test('parent profiles save normalized phones and student profiles cannot set one', async (t) => {
  const originalUpdateProfile = userModel.updateProfile;
  t.after(() => { userModel.updateProfile = originalUpdateProfile; });
  const calls = [];
  userModel.updateProfile = async (...args) => {
    calls.push(args);
    return { id: args[1], ...args[2], role: 'parent' };
  };

  const saved = createResponse();
  await updateProfile({
    user: { id: 'parent-1' },
    accessToken: 'token',
    profile: { role: 'parent' },
    body: { fullName: 'Nguyễn Thị Lan', phoneNumber: '091 234 5678' }
  }, saved);
  assert.equal(saved.body.profile.phone_number, '+84912345678');
  assert.equal(calls[0][2].phone_number, '+84912345678');

  const invalid = createResponse();
  await updateProfile({
    user: { id: 'parent-1' },
    accessToken: 'token',
    profile: { role: 'parent' },
    body: { fullName: 'Nguyễn Thị Lan', phoneNumber: '555' }
  }, invalid);
  assert.equal(invalid.statusCode, 400);

  const student = createResponse();
  await updateProfile({
    user: { id: 'student-1' },
    accessToken: 'token',
    profile: { role: 'student' },
    body: { fullName: 'Nguyễn Văn An', phoneNumber: '0912345678' }
  }, student);
  assert.equal(Object.prototype.hasOwnProperty.call(calls[1][2], 'phone_number'), false);
});
