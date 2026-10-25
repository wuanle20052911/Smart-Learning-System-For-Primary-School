const test = require('node:test');
const assert = require('node:assert/strict');

test('AI usage module exposes logging and summary without cost estimation', () => {
  const aiUsage = require('../services/aiUsage');

  assert.equal(typeof aiUsage.recordAIUsage, 'function');
  assert.equal(typeof aiUsage.getAdminAIUsageSummary, 'function');
  assert.equal('getCostUsd' in aiUsage, false);
});
