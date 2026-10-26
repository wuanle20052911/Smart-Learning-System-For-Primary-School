const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize: normalizeAssignment } = require('../controllers/assignmentController');
const { normalize: normalizeBankQuestion } = require('../controllers/questionBankController');

const multipleChoice = {
  type: 'multiple-choice',
  question: '2 + 3 bằng bao nhiêu?',
  options: ['4', '5', '6', '7'],
  answer: 1
};

test('new assignments accept only four-choice multiple-choice questions', () => {
  const payload = normalizeAssignment({ title: 'Ôn tập', questions: [multipleChoice] });
  assert.equal(payload.questions[0].type, 'multiple-choice');
  for (const type of ['true-false', 'fill-blank', 'short-answer', 'matching']) {
    assert.throws(() => normalizeAssignment({
      title: 'Ôn tập',
      questions: [{ ...multipleChoice, type }]
    }), /chỉ hỗ trợ câu trắc nghiệm/);
  }
});

test('question bank creation accepts only valid four-choice multiple-choice questions', () => {
  assert.equal(normalizeBankQuestion(multipleChoice).type, 'multiple-choice');
  for (const type of ['true-false', 'fill-blank', 'short-answer', 'matching']) {
    assert.throws(() => normalizeBankQuestion({ ...multipleChoice, type }), /Chỉ hỗ trợ tạo câu trắc nghiệm/);
  }
  assert.throws(() => normalizeBankQuestion({ ...multipleChoice, answer: 4 }), /Chỉ hỗ trợ tạo câu trắc nghiệm/);
});
