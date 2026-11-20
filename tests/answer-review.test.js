const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSubmissionReview, buildAttemptReview, isCorrect } = require('../services/answerReview');

test('submission review shows chosen and correct answers per question type', () => {
  const review = buildSubmissionReview([
    { position: 2, type: 'fill-blank', question: '5 + 5 = ?', options: [], answer: '10', explanation: '' },
    { position: 1, type: 'multiple-choice', question: '2 + 2 = ?', options: ['3', '4'], answer: 1, explanation: 'Đếm thêm 2.' },
    { position: 3, type: 'matching', question: 'Nối', options: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }], answer: [0, 1] }
  ], [0, ' 10 ', [1, 0]]);

  assert.deepEqual(review.map((item) => item.is_correct), [false, true, false]);
  assert.equal(review[0].chosen_answer, '3');
  assert.equal(review[0].correct_answer, '4');
  assert.equal(review[0].explanation, 'Đếm thêm 2.');
  assert.equal(review[2].chosen_answer, 'A → 2; B → 1');
});

test('submission review marks missing answers as unanswered', () => {
  const [item] = buildSubmissionReview([{ position: 1, type: 'short-answer', question: 'Q', answer: 'x' }], []);
  assert.equal(item.chosen_answer, 'Chưa trả lời');
  assert.equal(item.is_correct, false);
});

test('attempt review falls back to stored incorrect answers', () => {
  const review = buildAttemptReview({
    questions: [],
    incorrect_answers: [{ question: 'Q1', chosenAnswer: 'A', correctAnswer: 'B', explanation: 'Vì...' }]
  });
  assert.deepEqual(review, [{ position: 1, question: 'Q1', chosen_answer: 'A', correct_answer: 'B', explanation: 'Vì...', is_correct: false }]);
});

test('isCorrect accepts alternative text answers', () => {
  assert.equal(isCorrect({ type: 'short-answer', answer: ['mười', '10'] }, ' 10 '), true);
});
