function normalizeAnswer(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
}

function isCorrect(question, answer) {
  if (question.type === 'multiple-choice' || question.type === 'true-false') return Number(answer) === Number(question.answer);
  if (question.type === 'matching') return JSON.stringify(answer) === JSON.stringify(question.answer);
  const accepted = [question.answer, ...(Array.isArray(question.answer) ? question.answer : [])]
    .flat()
    .filter((item) => item !== null && item !== undefined)
    .map(normalizeAnswer);
  return accepted.includes(normalizeAnswer(answer));
}

function isMissing(answer) {
  return answer === undefined || answer === null || answer === '';
}

function displayAnswer(question, answer) {
  if (isMissing(answer)) return 'Chưa trả lời';
  const options = Array.isArray(question.options) ? question.options : [];
  if (question.type === 'matching') {
    if (!Array.isArray(answer)) return 'Chưa trả lời';
    return options
      .map((pair, index) => `${pair?.left ?? ''} → ${options[answer[index]]?.right ?? 'Chưa chọn'}`)
      .join('; ');
  }
  if (question.type === 'multiple-choice' || question.type === 'true-false') {
    const option = options[Number(answer)];
    return option === undefined || option === null ? String(answer) : String(option);
  }
  return Array.isArray(answer) ? answer.join(', ') : String(answer);
}

function buildSubmissionReview(questions, answers) {
  const answerList = Array.isArray(answers) ? answers : [];
  return [...questions]
    .sort((left, right) => (left.position || 0) - (right.position || 0))
    .map((question, index) => {
      const answer = answerList[index];
      return {
        position: index + 1,
        question: question.question,
        chosen_answer: displayAnswer(question, answer),
        correct_answer: displayAnswer(question, question.answer),
        explanation: question.explanation || '',
        is_correct: isCorrect(question, answer)
      };
    });
}

function buildAttemptReview(attempt) {
  const questions = Array.isArray(attempt.questions) && attempt.questions.length
    ? attempt.questions
    : Array.isArray(attempt.incorrect_answers) ? attempt.incorrect_answers.map((item) => ({ ...item, isCorrect: false })) : [];
  return questions.map((item, index) => ({
    position: index + 1,
    question: String(item?.question ?? ''),
    chosen_answer: String(item?.chosenAnswer ?? item?.chosen_answer ?? 'Chưa trả lời'),
    correct_answer: String(item?.correctAnswer ?? item?.correct_answer ?? ''),
    explanation: String(item?.explanation ?? ''),
    is_correct: item?.isCorrect === true || item?.is_correct === true
  }));
}

module.exports = { isCorrect, displayAnswer, buildSubmissionReview, buildAttemptReview };
