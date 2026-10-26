const test = require('node:test');
const assert = require('node:assert/strict');

test('AI usage module exposes logging and summary without cost estimation', () => {
  const aiUsage = require('../services/aiUsage');

  assert.equal(typeof aiUsage.recordAIUsage, 'function');
  assert.equal(typeof aiUsage.getAdminAIUsageSummary, 'function');
  assert.equal('getCostUsd' in aiUsage, false);
});

test('AI usage SSE stream is restricted to administrators', async () => {
  const { streamSummary } = require('../controllers/aiUsageController');
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  await streamSummary({ profile: { role: 'teacher' } }, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'Chỉ quản trị viên mới được xem thống kê AI.' });
});
