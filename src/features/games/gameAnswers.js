// Bản client của services/answerReview.js, dùng để hiển thị phần xem lại bài.
// Điểm chính thức luôn do server chấm.
const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
const missing = (answer) => answer === undefined || answer === null || answer === '';

export function isAnswerCorrect(question, answer) {
  const options = Array.isArray(question.options) ? question.options : [];
  if (question.type === 'ordering') {
    return Array.isArray(answer) && answer.length === options.length
      && answer.every((optionIndex, index) => normalize(options[optionIndex]) === normalize(options[index]));
  }
  if (question.type === 'cloze') {
    const expected = Array.isArray(question.answer) ? question.answer : [];
    return Array.isArray(answer) && answer.length === expected.length && expected.every((value, index) => normalize(value) === normalize(answer[index]));
  }
  if (question.type === 'matching') return JSON.stringify(answer) === JSON.stringify(question.answer);
  if (question.type === 'multiple-choice' || question.type === 'true-false') return !missing(answer) && Number(answer) === Number(question.answer);
  return !missing(answer) && normalize(answer) === normalize(question.answer);
}

export function answerText(question, answer) {
  if (missing(answer)) return 'Chưa trả lời';
  const options = Array.isArray(question.options) ? question.options : [];
  if (question.type === 'ordering') return Array.isArray(answer) ? answer.map((index) => options[index] ?? '?').join(' → ') : 'Chưa trả lời';
  if (question.type === 'cloze') return Array.isArray(answer) ? answer.map((value) => value || '…').join(', ') : 'Chưa trả lời';
  if (question.type === 'matching') {
    return Array.isArray(answer)
      ? options.map((pair, index) => `${pair?.left ?? ''} → ${options[answer[index]]?.right ?? 'Chưa chọn'}`).join('; ')
      : 'Chưa trả lời';
  }
  if (question.type === 'multiple-choice' || question.type === 'true-false') return String(options[Number(answer)] ?? answer);
  return Array.isArray(answer) ? answer.join(', ') : String(answer);
}
