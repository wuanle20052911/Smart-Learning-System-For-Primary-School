const test = require('node:test');
const assert = require('node:assert/strict');
const { answerElementaryMath, readVietnameseNumber } = require('../services/elementaryMath');

test('reads five-digit numbers by place value in Vietnamese', () => {
  assert.equal(readVietnameseNumber(54108), 'năm mươi tư nghìn một trăm linh tám');
  assert.equal(readVietnameseNumber(50000), 'năm mươi nghìn');
  assert.equal(readVietnameseNumber(10005), 'mười nghìn không trăm linh năm');
  assert.equal(readVietnameseNumber(99999), 'chín mươi chín nghìn chín trăm chín mươi chín');
  assert.equal(readVietnameseNumber(100000), null);
});

test('answers number-reading questions without asking a chat model', () => {
  assert.deepEqual(answerElementaryMath('cách đọc số 54108'), {
    message: 'Số 54108 đọc là năm mươi tư nghìn một trăm linh tám.',
    suggestionId: null
  });
  assert.match(answerElementaryMath('cách đọc số 5 chữ số').message, /hàng chục nghìn/);
});

test('explains fraction addition with same or different denominators', () => {
  assert.match(answerElementaryMath('cách cộng 2 phân số cùng mẫu số').message, /cộng hai tử số và giữ nguyên mẫu số/);
  assert.match(answerElementaryMath('cách cộng 2 phân số').message, /quy đồng trước/);
  assert.equal(
    answerElementaryMath('Tính 2/5 + 1/5, cộng hai phân số').message,
    'Quy đồng rồi cộng tử số: 2/5 + 1/5 = 3/5.'
  );
});


test('recognizes short calculations and grouped numbers', () => {
  assert.match(answerElementaryMath('1/2 + 1/3').message, /5\/6/);
  assert.match(answerElementaryMath('cach doc so 54 108').message, /năm mươi tư nghìn một trăm linh tám/);
  assert.match(answerElementaryMath('cách đọc số 54.108').message, /năm mươi tư nghìn một trăm linh tám/);
  assert.match(answerElementaryMath('cách đọc số năm chữ số').message, /54 108/);
  assert.match(answerElementaryMath('1/0 + 1/3').message, /khác 0/);
});

test('does not silently solve a different question', () => {
  assert.equal(answerElementaryMath('cách đọc số 100000'), null);
  assert.equal(answerElementaryMath('cộng phân số 1/2 + 1/3 + 1/4'), null);
  assert.equal(answerElementaryMath('cộng trừ phân số 1/2 - 1/3'), null);

});
