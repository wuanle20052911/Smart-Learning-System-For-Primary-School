const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPersonalizedDraft } = require('../services/personalizedAssignment');

const question = (id, lessonId) => ({
  id,
  lesson_id: lessonId,
  question: `Câu hỏi ${id}`,
  type: 'multiple-choice',
  options: ['A', 'B', 'C', 'D'],
  answer: 0
});

test('selects bank questions from lessons below the accuracy threshold', () => {
  const result = buildPersonalizedDraft([
    { lesson_id: 'weak', lesson_title: 'Phân số', score: 2, total: 5 },
    { lesson_id: 'strong', lesson_title: 'Phép cộng', score: 9, total: 10 }
  ], [
    question('q1', 'weak'),
    question('q2', 'strong'),
    question('q3', 'weak')
  ]);

  assert.deepEqual(result.lessons.map((lesson) => lesson.lesson_id), ['weak']);
  assert.equal(result.lessons[0].accuracy, 40);
  assert.deepEqual(result.questions.map((item) => item.id), ['q1', 'q3']);
  assert.equal(result.reason, null);
});

test('balances questions across weak lessons and caps assignments at ten questions', () => {
  const attempts = [
    { lesson_id: 'weak-a', lesson_title: 'Bài A', score: 1, total: 5 },
    { lesson_id: 'weak-b', lesson_title: 'Bài B', score: 2, total: 5 }
  ];
  const questions = [
    ...Array.from({ length: 10 }, (_, index) => question(`a${index}`, 'weak-a')),
    ...Array.from({ length: 10 }, (_, index) => question(`b${index}`, 'weak-b'))
  ];
  const result = buildPersonalizedDraft(attempts, questions);

  assert.equal(result.questions.length, 10);
  assert.equal(result.questions.filter((item) => item.lesson_id === 'weak-a').length, 5);
  assert.equal(result.questions.filter((item) => item.lesson_id === 'weak-b').length, 5);
});

test('reports when there are no attempts, no weak lessons, or no matching bank questions', () => {
  assert.equal(buildPersonalizedDraft([], []).reason, 'no-attempts');
  assert.equal(buildPersonalizedDraft([
    { lesson_id: 'strong', lesson_title: 'Bài tốt', score: 8, total: 10 }
  ], []).reason, 'no-weak-lessons');
  assert.equal(buildPersonalizedDraft([
    { lesson_id: 'weak', lesson_title: 'Bài yếu', score: 1, total: 5 }
  ], [question('other', 'different-lesson')]).reason, 'no-bank-questions');
});
