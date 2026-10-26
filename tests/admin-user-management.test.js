const test = require('node:test');
const assert = require('node:assert/strict');
const userModel = require('../models/userModel');
const { listManagedUsers, setManagedUserDisabled } = require('../controllers/authController');

function createResponse() {
  return {
    statusCode: 200,
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

test('managed user list is restricted to admins and returns account data', async (t) => {
  const originalList = userModel.listManagedUsers;
  t.after(() => { userModel.listManagedUsers = originalList; });
  let calls = 0;
  userModel.listManagedUsers = async () => {
    calls += 1;
    return [{ id: 'student-1', role: 'student', disabled: false }];
  };

  const denied = createResponse();
  await listManagedUsers({ profile: { role: 'teacher' } }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(calls, 0);

  const allowed = createResponse();
  await listManagedUsers({ profile: { role: 'admin' } }, allowed);
  assert.deepEqual(allowed.body.users, [{ id: 'student-1', role: 'student', disabled: false }]);
  assert.equal(calls, 1);
});

test('account status updates require an admin and a boolean status', async (t) => {
  const originalUpdate = userModel.setManagedUserDisabled;
  t.after(() => { userModel.setManagedUserDisabled = originalUpdate; });
  const calls = [];
  userModel.setManagedUserDisabled = async (id, disabled) => {
    calls.push({ id, disabled });
    return { id, role: 'teacher', disabled };
  };

  const denied = createResponse();
  await setManagedUserDisabled({ profile: { role: 'teacher' }, params: { id: 'teacher-1' }, body: { disabled: true } }, denied);
  assert.equal(denied.statusCode, 403);

  const invalid = createResponse();
  await setManagedUserDisabled({ profile: { role: 'admin' }, params: { id: 'teacher-1' }, body: { disabled: 'true' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);

  const allowed = createResponse();
  await setManagedUserDisabled({ profile: { role: 'admin' }, params: { id: 'teacher-1' }, body: { disabled: true } }, allowed);
  assert.deepEqual(calls, [{ id: 'teacher-1', disabled: true }]);
  assert.deepEqual(allowed.body.user, { id: 'teacher-1', role: 'teacher', disabled: true });
});
