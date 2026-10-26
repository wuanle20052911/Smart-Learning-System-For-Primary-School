export function toMeteorGameQuestions(lessonGroups) {
  const seen = new Set();
  const questions = [];
  lessonGroups.forEach(({ questions: lessonQuestions = [] }) => {
    lessonQuestions.forEach((item) => {
      if (item.type !== 'multiple-choice' || typeof item.question !== 'string' || !item.question.trim()
        || !Array.isArray(item.options) || item.options.length !== 4
        || !item.options.every((option) => typeof option === 'string' && option.trim())
        || new Set(item.options.map((option) => option.trim().toLocaleLowerCase('vi-VN'))).size !== 4
        || !Number.isInteger(item.answer) || item.answer < 0 || item.answer >= item.options.length) return;
      const questionKey = item.question.trim().toLocaleLowerCase('vi-VN');
      if (seen.has(questionKey)) return;
      seen.add(questionKey);
      questions.push({
        q: item.question.trim(),
        a: item.options[item.answer].trim(),
        w: item.options.filter((_, index) => index !== item.answer).map((option) => option.trim())
      });
    });
  });
  return questions;
}
