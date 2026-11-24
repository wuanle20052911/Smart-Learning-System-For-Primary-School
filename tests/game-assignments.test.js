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

test('digit-arrange strips spaces from the answer', () => {
  const [item] = normalizeGameQuestions('digit-arrange', [{ question: 'Lập số lớn nhất từ 3, 0, 7, 5', answer: '7 530' }]);
  assert.equal(item.answer, '7530');
  assert.equal(isCorrect(item, '7530'), true);
});

test('unknown game types are rejected and gameshow time limits are clamped', () => {
  assert.throws(() => normalizeGameQuestions('spin-wheel', [{}]), /không hợp lệ/);
  assert.deepEqual(normalizeGameSettings('gameshow', { time_limit: 5 }), { time_limit: 20 });
  assert.deepEqual(normalizeGameSettings('gameshow', { time_limit: 30 }), { time_limit: 30 });
  assert.deepEqual(normalizeGameSettings('quiz', { time_limit: 30 }), {});
});
