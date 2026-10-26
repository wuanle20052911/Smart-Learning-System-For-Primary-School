const test = require('node:test');
const assert = require('node:assert/strict');
const { toMeteorGameQuestions } = require('../src/services/meteorGameQuestions.js');

test('maps studied multiple-choice questions into meteor game answer rows', () => {
  const questions = toMeteorGameQuestions([{
    questions: [{
      type: 'multiple-choice',
      question: '2 + 3 bằng bao nhiêu?',
      options: ['4', '5', '6', '7'],
      answer: 1
    }]
  }]);
  assert.deepEqual(questions, [{ q: '2 + 3 bằng bao nhiêu?', a: '5', w: ['4', '6', '7'] }]);
});

test('ignores unsupported, malformed, and duplicate lesson questions', () => {
  const valid = { type: 'multiple-choice', question: 'Câu hợp lệ?', options: ['A', 'B', 'C', 'D'], answer: 2 };
  assert.deepEqual(toMeteorGameQuestions([
    { questions: [
      valid,
      { ...valid, question: '  câu hợp lệ?  ' },
      { ...valid, type: 'short-answer', question: 'Không phải trắc nghiệm' },
      { ...valid, question: 'Thiếu phương án', options: ['A', 'B', 'C'] },
      { ...valid, question: 'Đáp án ngoài phạm vi', answer: 4 },
      { ...valid, question: 'Phương án bị trùng', options: ['A', 'A', 'C', 'D'] }
    ] }
  ]), [{ q: 'Câu hợp lệ?', a: 'C', w: ['A', 'B', 'D'] }]);
});
