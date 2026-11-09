const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChildInsights } = require('../services/parentInsights');

test('parent progress counts only published assignments and valid on-time submissions', () => {
  const result = buildChildInsights({
    student: { id: 'student-1', full_name: 'Nguyễn An' },
    classes: [{ id: 'class-1', name: 'Lớp 4A', grade: '4' }],
    assignments: [
      { id: 'assignment-1', title: 'Phân số', class_id: 'class-1', due_at: '2026-01-20T00:00:00Z', published: true },
      { id: 'assignment-2', title: 'Hình học', class_id: 'class-1', due_at: '2026-01-05T00:00:00Z', published: true },
      { id: 'assignment-3', title: 'Bản nháp', class_id: 'class-1', due_at: null, published: false },
      { id: 'assignment-4', title: 'Lớp khác', class_id: 'class-2', due_at: null, published: true }
    ],
    submissions: [
      { assignment_id: 'assignment-1', submitted_at: '2026-01-10T00:00:00Z', score: 90 },
      { assignment_id: 'assignment-2', submitted_at: '2026-01-06T00:00:00Z', score: 70 },
      { assignment_id: 'assignment-4', submitted_at: '2026-01-02T00:00:00Z', score: 100 }
    ],
    attempts: [],
    now: new Date('2026-01-10T00:00:00Z').getTime()
  });

  assert.equal(result.summary.assigned_count, 2);
  assert.equal(result.summary.submitted_count, 1);
  assert.equal(result.summary.completion_rate, 50);
  assert.deepEqual(result.assignments.map((item) => item.status).sort(), ['overdue', 'submitted']);
});

test('parent insights identify strengths, practice needs, recommendations, and saved-score trend', () => {
  const result = buildChildInsights({
    student: { id: 'student-1', full_name: 'Nguyễn An' },
    classes: [],
    assignments: [],
    submissions: [],
    attempts: [
      { title: 'Phân số', chapter: 'Chương 1', score: 2, total: 10, created_at: '2026-01-01T00:00:00Z' },
      { title: 'Hình học', chapter: 'Chương 2', score: 9, total: 10, created_at: '2026-01-02T00:00:00Z' }
    ]
  });

  assert.equal(result.trend.direction, 'improving');
  assert.deepEqual(result.strengths.map((item) => item.title), ['Hình học']);
  assert.deepEqual(result.needs_practice.map((item) => item.title), ['Phân số']);
  assert.equal(result.recommendations.length, 1);
  assert.match(result.recommendations[0].text, /Phân số/);
});
