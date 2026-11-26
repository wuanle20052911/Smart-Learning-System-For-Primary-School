const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGameQuestions, normalizeGameSettings } = require('../services/gameAssignments');
const { isCorrect, displayAnswer } = require('../services/answerReview');

test('match-up pairs become fill-blank items graded by text', () => {
  const items = normalizeGameQuestions('match-up', [
    { question: '125 × 8', answer: '1 000' },
    { question: '1 tấn', answer: '1 000 kg' },
    { question: '1/2', answer: '0,5' }
  ]);
  assert.equal(items.length, 3);
  assert.equal(items[0].type, 'fill-blank');
  assert.equal(isCorrect(items[1], ' 1 000 KG '), true);
  assert.equal(isCorrect(items[1], '1 000'), false);
});

test('match-up rejects duplicate right-hand answers', () => {
  assert.throws(() => normalizeGameQuestions('match-up', [
    { question: 'A', answer: '1' }, { question: 'B', answer: '1' }, { question: 'C', answer: '2' }
  ]), /trùng/);
});

test('group-sort needs the same groups on every card', () => {
  const groups = ['Chẵn', 'Lẻ'];
  const items = normalizeGameQuestions('group-sort', [
    { question: '12', options: groups, answer: 0 },
    { question: '7', options: groups, answer: 1 },
    { question: '30', options: groups, answer: 0 },
    { question: '45', options: groups, answer: 1 }
  ]);
  assert.equal(isCorrect(items[1], 1), true);
  assert.throws(() => normalizeGameQuestions('group-sort', [
    { question: '12', options: groups, answer: 0 },
    { question: '7', options: ['Chẵn', 'Lẻ', 'Khác'], answer: 1 },
    { question: '30', options: groups, answer: 0 },
    { question: '45', options: groups, answer: 1 }
  ]), /chung/);
});

test('ordering stores the correct order and grades by labels', () => {
  const [item] = normalizeGameQuestions('ordering', [{ question: 'Xếp tăng dần', options: ['45 678', '45 768', '45 867'] }]);
  assert.deepEqual(item.answer, [0, 1, 2]);
  assert.equal(isCorrect(item, [0, 1, 2]), true);
  assert.equal(isCorrect(item, [1, 0, 2]), false);
  assert.equal(isCorrect(item, [0, 1]), false);
  assert.equal(displayAnswer(item, [1, 0, 2]), '45 768 → 45 678 → 45 867');
});

test('cloze needs one answer per blank and grades every blank', () => {
  const [item] = normalizeGameQuestions('cloze', [{ question: '3 tạ 5 kg = ___ kg; 2 giờ = ___ phút', answer: ['305', '120'], options: ['35'] }]);
  assert.deepEqual(item.options, ['35']);
  assert.equal(isCorrect(item, ['305', '120']), true);
  assert.equal(isCorrect(item, ['35', '120']), false);
  assert.throws(() => normalizeGameQuestions('cloze', [{ question: '1 + 1 = ___', answer: [] }]), /chỗ trống/);
  assert.throws(() => normalizeGameQuestions('cloze', [{ question: 'Không có ô trống', answer: ['1'] }]), /chỗ trống/);
});

test('quiz accepts two to four options', () => {
  const [item] = normalizeGameQuestions('quiz', [{ question: '7 × 8 = ?', options: ['56', '54'], answer: 0 }]);
  assert.equal(isCorrect(item, 0), true);
  assert.throws(() => normalizeGameQuestions('quiz', [{ question: 'Q', options: ['1'], answer: 0 }]), /lựa chọn/);
});

test('detective pattern validates a numeric sequence with one missing value', () => {
  const [item] = normalizeGameQuestions('detective-pattern', [
    { question: '2, 4, ?, 8', options: ['6', '7', '9'], answer: 0, explanation: 'Cộng 2.' }
  ]);
  assert.equal(item.type, 'multiple-choice');
  assert.equal(isCorrect(item, 0), true);
  assert.throws(() => normalizeGameQuestions('detective-pattern', [
    { question: '2, 4, 6, 8', options: ['10', '12'], answer: 0 }
  ]), /dấu hỏi/);
  assert.throws(() => normalizeGameQuestions('detective-pattern', [
    { question: '2, ?, ?, 8', options: ['6', '7'], answer: 0 }
  ]), /dấu hỏi/);
  assert.throws(() => normalizeGameQuestions('detective-pattern', [
    { question: '2, ?, 8', options: ['6', '06'], answer: 0 }
  ]), /không trùng nhau/);
});

test('new math game assignments normalize to supported question types', () => {
  const [sortQuestion] = normalizeGameQuestions('sort-numbers', [
    { question: 'Xếp tăng dần', options: ['8 999', '15 230', '45 100'] }
  ]);
  assert.equal(sortQuestion.type, 'ordering');
  assert.equal(isCorrect(sortQuestion, [0, 1, 2]), true);
  assert.equal(isCorrect(sortQuestion, [2, 1, 0]), false);

  const [comparisonQuestion] = normalizeGameQuestions('compare-numbers', [
    { question: '45 678 ___ 45 687', options: ['>', '<', '='], answer: 1 }
  ]);
  assert.equal(comparisonQuestion.type, 'multiple-choice');
  assert.equal(isCorrect(comparisonQuestion, 1), true);

  const [placeValueQuestion] = normalizeGameQuestions('decode-place-value', [
    { question: 'Trong số 48 215, chữ số 8 thuộc hàng nào?', options: ['Hàng trăm', 'Hàng nghìn'], answer: 1 }
  ]);
  assert.equal(placeValueQuestion.type, 'multiple-choice');
  assert.equal(isCorrect(placeValueQuestion, 1), true);
});

test('digit-arrange strips spaces from the answer', () => {
  const [item] = normalizeGameQuestions('digit-arrange', [{ question: 'Lập số lớn nhất từ 3, 0, 7, 5', answer: '7 530' }]);
  assert.equal(item.answer, '7530');
  assert.equal(isCorrect(item, '7530'), true);
});

test('flash cards grade the learner self-rating and require a usable deck', () => {
  const items = normalizeGameQuestions('flash-cards', [
    { question: '7 × 8', answer: '56' },
    { question: '1 km', answer: '1 000 m' }
  ]);
  assert.equal(items[0].type, 'fill-blank');
  assert.equal(isCorrect(items[0], '56'), true);
  assert.equal(isCorrect(items[0], 'Cần ôn thêm'), false);
  assert.throws(() => normalizeGameQuestions('flash-cards', [{ question: '7 × 8', answer: '56' }]), /ít nhất 2 mục/);
});

test('unknown game types are rejected and gameshow time limits are clamped', () => {
  assert.throws(() => normalizeGameQuestions('spin-wheel', [{}]), /không hợp lệ/);
  assert.deepEqual(normalizeGameSettings('gameshow', { time_limit: 5 }), { time_limit: 20 });
  assert.deepEqual(normalizeGameSettings('gameshow', { time_limit: 30 }), { time_limit: 30 });
  assert.deepEqual(normalizeGameSettings('quiz', { time_limit: 30 }), {});
  assert.deepEqual(normalizeGameSettings('flash-cards', { theme: 'ocean' }), { theme: 'ocean' });
  assert.deepEqual(normalizeGameSettings('flash-cards'), { theme: 'garden' });
  assert.throws(() => normalizeGameSettings('flash-cards', { theme: 'unknown' }), /Chủ đề/);
});
