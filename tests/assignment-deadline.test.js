const test = require('node:test');
const assert = require('node:assert/strict');
const { isAssignmentClosed, normalizeDueAt } = require('../services/assignmentDeadline');

test('normalizes valid deadlines and allows no deadline', () => {
  assert.equal(normalizeDueAt(null), null);
  assert.equal(normalizeDueAt('2030-01-01T12:00:00+07:00'), '2030-01-01T05:00:00.000Z');
});

test('rejects invalid and already elapsed deadlines for published assignments', () => {
  assert.throws(() => normalizeDueAt('not-a-date'), /không hợp lệ/);
  assert.throws(() => normalizeDueAt('2020-01-01T00:00:00Z', true), /tương lai/);
});

test('closes submissions at the deadline, but not before it', () => {
  const assignment = { due_at: '2030-01-01T00:00:00.000Z' };
  assert.equal(isAssignmentClosed(assignment, Date.parse('2029-12-31T23:59:59.000Z')), false);
  assert.equal(isAssignmentClosed(assignment, Date.parse('2030-01-01T00:00:00.000Z')), true);
  assert.equal(isAssignmentClosed({ due_at: null }), false);
});
