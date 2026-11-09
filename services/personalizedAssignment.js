const WEAK_ACCURACY_THRESHOLD = 70;
const MAX_WEAK_LESSONS = 3;
const MAX_ASSIGNMENT_QUESTIONS = 10;

function buildPersonalizedDraft(attempts, bankQuestions) {
  const performanceByLesson = new Map();
  for (const attempt of attempts) {
    const score = Number(attempt.score);
    const total = Number(attempt.total);
    if (!attempt.lesson_id || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) continue;
    const current = performanceByLesson.get(attempt.lesson_id) || {
      lesson_id: attempt.lesson_id,
      lesson_title: attempt.lesson_title || attempt.title || 'Bài học chưa có tiêu đề',
      score: 0,
      total: 0,
      attempts: 0
    };
    current.score += score;
    current.total += total;
    current.attempts += 1;
    performanceByLesson.set(attempt.lesson_id, current);
  }

  const weakestLessons = [...performanceByLesson.values()]
    .map((lesson) => {
      const accuracyValue = lesson.score / lesson.total * 100;
      return { ...lesson, accuracy: Math.round(accuracyValue), accuracyValue };
    })
    .filter((lesson) => lesson.accuracyValue < WEAK_ACCURACY_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy || a.lesson_title.localeCompare(b.lesson_title, 'vi'))
    .slice(0, MAX_WEAK_LESSONS);
  if (!weakestLessons.length) {
    return {
      lessons: [],
      questions: [],
      reason: performanceByLesson.size ? 'no-weak-lessons' : 'no-attempts'
    };
  }

  const eligibleByLesson = new Map(weakestLessons.map((lesson) => [lesson.lesson_id, []]));
  for (const question of bankQuestions) {
    const lessonQuestions = eligibleByLesson.get(question.lesson_id);
    if (!lessonQuestions || question.type !== 'multiple-choice' || typeof question.question !== 'string'
      || !question.question.trim() || !Array.isArray(question.options) || question.options.length !== 4
      || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= 4) continue;
    lessonQuestions.push({
      ...question,
      lesson_title: weakestLessons.find((lesson) => lesson.lesson_id === question.lesson_id).lesson_title
    });
  }

  const lessons = weakestLessons.map((lesson) => ({
    ...lesson,
    bankQuestionCount: eligibleByLesson.get(lesson.lesson_id).length
  }));
  const questions = [];
  let round = 0;
  while (questions.length < MAX_ASSIGNMENT_QUESTIONS) {
    let addedQuestion = false;
    for (const lesson of lessons) {
      const question = eligibleByLesson.get(lesson.lesson_id)[round];
      if (!question) continue;
      questions.push(question);
      addedQuestion = true;
      if (questions.length === MAX_ASSIGNMENT_QUESTIONS) break;
    }
    if (!addedQuestion) break;
    round += 1;
  }

  return {
    lessons,
    questions,
    reason: questions.length ? null : 'no-bank-questions'
  };
}

module.exports = {
  WEAK_ACCURACY_THRESHOLD,
  MAX_WEAK_LESSONS,
  MAX_ASSIGNMENT_QUESTIONS,
  buildPersonalizedDraft
};
