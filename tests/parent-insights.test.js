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

test('parent insights attach teacher feedback, attention alerts, and completed lessons', () => {
  const result = buildChildInsights({
    student: { id: 'student-1', full_name: 'Nguyễn An' },
    classes: [{ id: 'class-1', name: 'Lớp 4A', grade: '4' }],
    assignments: [{ id: 'assignment-1', title: 'Phân số', class_id: 'class-1', due_at: null, published: true }],
    submissions: [{ id: 'submission-1', assignment_id: 'assignment-1', submitted_at: '2026-01-10T00:00:00Z', score: 80 }],
    attempts: [],
    feedback: [
      { id: 'feedback-1', submission_id: 'submission-1', comment: 'Cũ', created_at: '2026-01-11T00:00:00Z' },
      { id: 'feedback-2', submission_id: 'submission-1', comment: 'Con làm tốt', created_at: '2026-01-12T00:00:00Z' },
      { id: 'feedback-3', submission_id: 'other-submission', comment: 'Không liên quan', created_at: '2026-01-12T00:00:00Z' }
    ],
    alerts: [
      { risk_level: 'Theo dõi', reason: 'Còn 1 bài đã quá hạn chưa nộp.', last_seen_at: '2026-01-09T00:00:00Z' },
      { risk_level: 'Cao', reason: 'Điểm trung bình thấp.', last_seen_at: '2026-01-12T00:00:00Z' }
    ],
    completions: [
      { lesson_id: 'lesson-1', completed_at: '2026-01-05T00:00:00Z' },
      { lesson_id: 'lesson-2', completed_at: '2026-01-08T00:00:00Z' },
      { lesson_id: 'deleted-lesson', completed_at: '2026-01-09T00:00:00Z' }
    ],
    lessons: [
      { id: 'lesson-1', title: 'Cộng trừ', topic: 'Số học' },
      { id: 'lesson-2', title: 'Hình vuông', topic: '' }
    ]
  });

  const [assignment] = result.assignments;
  assert.equal(assignment.submission_id, 'submission-1');
  assert.deepEqual(assignment.feedback.map((item) => item.comment), ['Con làm tốt', 'Cũ']);
  assert.equal(result.recommendations[0].type, 'feedback');
  assert.equal(result.attention.level, 'high');
  assert.deepEqual(result.attention.reasons, ['Điểm trung bình thấp.', 'Còn 1 bài đã quá hạn chưa nộp.']);
  assert.equal(result.summary.completed_lesson_count, 2);
  assert.deepEqual(result.completed_lessons.map((item) => item.title), ['Hình vuông', 'Cộng trừ']);
});

test('parent insights have no attention banner without active alerts', () => {
  const result = buildChildInsights({ student: { id: 's', full_name: 'A' }, classes: [], assignments: [], submissions: [], attempts: [] });
  assert.equal(result.attention, null);
  assert.equal(result.summary.completed_lesson_count, 0);
});
