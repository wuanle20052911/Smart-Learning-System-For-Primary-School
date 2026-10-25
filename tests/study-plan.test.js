const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStudyPlan } = require('../services/studyPlan');
const { classifyStudyIntent, fallbackStudyIntent } = require('../services/studyIntent');

const lessons = [
  { id: 'lesson-1', title: 'Ôn tập Phân số', published: true },
  { id: 'lesson-2', title: 'Phép cộng', published: true }
];

test('uses the local chat model to classify broad student learning intents', async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/api/tags')) {
      return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b' }] }) };
    }
    return { ok: true, json: async () => ({ message: { content: '{"intent":"recommendation"}' } }) };
  };
  const result = await classifyStudyIntent('Con muốn bắt đầu từ đâu nhỉ?', {
    fetchImpl,
    baseUrl: 'http://ollama.test',
    timeoutMs: 100
  });

  assert.deepEqual(result, { intent: 'recommendation', source: 'local_ai' });
  assert.match(requests[1].options.body, /Con muốn bắt đầu từ đâu nhỉ/);
});

test('uses a safe deterministic intent when the local model is unavailable', async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await classifyStudyIntent('Bạn có thể gợi ý gì không?', {
      fetchImpl: async () => { throw new Error('Ollama unavailable'); },
      baseUrl: 'http://ollama.test',
      timeoutMs: 100
    });
    assert.deepEqual(result, { intent: 'other', source: 'fallback' });
  } finally {
    console.warn = originalWarn;
  }
});

test('does not let the local model misclassify a clear homework question', async () => {
  const result = await classifyStudyIntent('Hôm nay con có bài tập gì không?', {
    fetchImpl: async () => {
      throw new Error('Clear homework questions should not need local AI classification.');
    },
    baseUrl: 'http://ollama.test'
  });

  assert.deepEqual(result, { intent: 'assignments', source: 'keyword' });
});

test('fallback distinguishes clear assignment, learning, and lesson-content questions', () => {
  assert.equal(fallbackStudyIntent('Con còn bài tập nào chưa làm?'), 'assignments');
  assert.equal(fallbackStudyIntent('Oke vậy hôm nay con làm gì trước?'), 'recommendation');
  assert.equal(fallbackStudyIntent('Làm tròn số đến hàng nghìn là gì?'), 'other');
});

test('lists pending assignments, including overdue work, with their due status', () => {
  const plan = buildStudyPlan({
    lessons,
    intent: 'assignments',
    assignments: [
      { id: 'overdue', title: 'Bài quá hạn', published: true, due_at: '2026-10-24T10:00:00Z' },
      { id: 'pending', title: 'Bài chưa đến hạn', published: true, due_at: '2026-11-02T12:00:00Z' },
      { id: 'submitted', title: 'Bài đã nộp', published: true }
    ],
    submissions: [{ assignment_id: 'submitted' }],
    attempts: [],
    now: Date.parse('2026-10-25T10:00:00Z')
  });

  assert.equal(plan.type, 'assignments');
  assert.deepEqual(plan.assignments.map((assignment) => [assignment.id, assignment.isOverdue]), [
    ['overdue', true],
    ['pending', false]
  ]);
});

test('says there are no pending assignments when all assigned work is submitted', () => {
  const plan = buildStudyPlan({
    lessons,
    intent: 'assignments',
    assignments: [{ id: 'submitted', title: 'Bài đã nộp', published: true }],
    submissions: [{ assignment_id: 'submitted' }],
    attempts: []
  });

  assert.deepEqual(plan.assignments, []);
  assert.match(plan.title, /không có bài tập nào chưa nộp/);
});

test('prioritizes an available assignment with the nearest deadline', () => {
  const plan = buildStudyPlan({
    lessons,
    assignments: [
      { id: 'later', title: 'Bài sau', published: true, due_at: '2026-10-28T10:00:00Z' },
      { id: 'soon', title: 'Bài sắp đến hạn', published: true, due_at: '2026-10-26T12:00:00Z' }
    ],
    submissions: [],
    attempts: [],
    now: Date.parse('2026-10-25T10:00:00Z')
  });

  assert.equal(plan.type, 'assignment');
  assert.equal(plan.assignment.id, 'soon');
  assert.match(plan.reason, /sắp đến hạn/);
});

test('recommends reviewing a lesson when recent practice accuracy is below 70 percent', () => {
  const plan = buildStudyPlan({
    lessons,
    assignments: [],
    submissions: [],
    attempts: [{ lesson_id: 'lesson-1', score: 2, total: 5 }],
    completedLessonIds: ['lesson-2']
  });

  assert.equal(plan.type, 'review');
  assert.equal(plan.lesson.id, 'lesson-1');
  assert.match(plan.reason, /2\/5 câu \(40%\)/);
});

test('prefers a weak lesson over an assignment that is not due soon', () => {
  const plan = buildStudyPlan({
    lessons,
    assignments: [{ id: 'later', title: 'Bài còn hạn dài', published: true, due_at: '2026-10-30T10:00:00Z' }],
    submissions: [],
    attempts: [{ lesson_id: 'lesson-1', score: 2, total: 5 }],
    now: Date.parse('2026-10-25T10:00:00Z')
  });

  assert.equal(plan.type, 'review');
  assert.equal(plan.lesson.id, 'lesson-1');
});

test('recommends the next uncompleted lesson when there is no urgent work or weak result', () => {
  const plan = buildStudyPlan({
    lessons,
    assignments: [{ id: 'later', title: 'Bài còn hạn dài', published: true }],
    submissions: [],
    attempts: [{ lesson_id: 'lesson-1', score: 4, total: 5 }],
    completedLessonIds: ['lesson-1']
  });

  assert.equal(plan.type, 'lesson');
  assert.equal(plan.lesson.id, 'lesson-2');
});

test('returns a positive fallback when every published lesson is complete', () => {
  const plan = buildStudyPlan({
    lessons,
    assignments: [],
    submissions: [],
    attempts: [],
    completedLessonIds: ['lesson-1', 'lesson-2']
  });

  assert.equal(plan.type, 'complete');
  assert.equal(plan.lesson, null);
  assert.equal(plan.assignment, null);
});
