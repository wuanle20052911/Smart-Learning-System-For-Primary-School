function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildStudyPlan({ lessons, assignments, submissions, attempts, completedLessonIds = [], intent = 'recommendation', now = Date.now() }) {
  const publishedLessons = lessons.filter((lesson) => lesson.published);
  const completed = new Set(completedLessonIds.filter((id) => publishedLessons.some((lesson) => lesson.id === id)));
  const submissionByAssignment = new Map(submissions.map((submission) => [submission.assignment_id, submission]));
  const pendingAssignmentsOverview = assignments
    .filter((assignment) => assignment.published && !submissionByAssignment.has(assignment.id))
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueAt: assignment.due_at || null,
      isOverdue: Boolean(assignment.due_at && new Date(assignment.due_at).getTime() <= now)
    }))
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
      const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Infinity;
      const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Infinity;
      return leftDue - rightDue;
    });
  if (intent === 'assignments') {
    return {
      type: 'assignments',
      title: pendingAssignmentsOverview.length
        ? `Con còn ${pendingAssignmentsOverview.length} bài tập chưa nộp.`
        : 'Hiện con không có bài tập nào chưa nộp.',
      reason: pendingAssignmentsOverview.length
        ? 'Đây là các bài tập cô đã giao nhưng hệ thống chưa ghi nhận bài nộp.'
        : 'Các bài tập đã giao đều đã nộp hoặc hiện chưa có bài tập mới.',
      assignments: pendingAssignmentsOverview,
      lesson: null,
      assignment: null,
      studyMinutes: 15,
      practiceQuestions: null
    };
  }
  const pendingAssignments = assignments
    .filter((assignment) => assignment.published && !submissionByAssignment.has(assignment.id))
    .filter((assignment) => assignment.due_at && new Date(assignment.due_at).getTime() > now
      && new Date(assignment.due_at).getTime() - now <= 72 * 60 * 60 * 1000)
    .sort((left, right) => {
      const leftDue = left.due_at ? new Date(left.due_at).getTime() : Infinity;
      const rightDue = right.due_at ? new Date(right.due_at).getTime() : Infinity;
      return leftDue - rightDue;
    });

  const resultsByLesson = new Map();
  const addResult = (lesson, correct, total) => {
    if (!lesson || !Number.isFinite(Number(correct)) || !Number.isFinite(Number(total)) || Number(total) <= 0) return;
    const result = resultsByLesson.get(lesson.id) || { correct: 0, total: 0 };
    result.correct += Number(correct);
    result.total += Number(total);
    resultsByLesson.set(lesson.id, result);
  };
  const findLesson = (attempt) => {
    if (attempt.lesson_id) return publishedLessons.find((lesson) => lesson.id === attempt.lesson_id);
    const title = normalizeText(`${attempt.title || ''} ${attempt.chapter || ''}`);
    return publishedLessons.find((lesson) => {
      const lessonTitle = normalizeText(lesson.title);
      return lessonTitle.length >= 4 && title.includes(lessonTitle);
    });
  };

  attempts.forEach((attempt) => addResult(findLesson(attempt), attempt.score, attempt.total));
  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  submissions.forEach((submission) => {
    const assignment = assignmentsById.get(submission.assignment_id);
    const lesson = publishedLessons.find((item) => item.id === assignment?.lesson_id);
    addResult(lesson, submission.correct_count, submission.total_questions);
  });

  const weakLesson = publishedLessons
    .map((lesson) => {
      const result = resultsByLesson.get(lesson.id);
      return result ? { lesson, ...result, accuracy: Math.round(result.correct / result.total * 100) } : null;
    })
    .filter((result) => result && result.total >= 3 && result.accuracy < 70)
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)[0];

  if (pendingAssignments.length) {
    const assignment = pendingAssignments[0];
    const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;
    const hoursUntilDue = dueAt ? (dueAt.getTime() - now) / (60 * 60 * 1000) : null;
    const urgency = hoursUntilDue !== null && hoursUntilDue <= 24
      ? 'Bài tập này đến hạn trong vòng 24 giờ.'
      : dueAt && hoursUntilDue <= 72
        ? 'Bài tập này sắp đến hạn trong vòng 3 ngày.'
        : 'Bài tập này sắp đến hạn.';
    const lesson = publishedLessons.find((item) => item.id === assignment.lesson_id);
    return {
      type: 'assignment',
      title: `Hoàn thành bài tập: ${assignment.title}`,
      reason: urgency,
      assignment: { id: assignment.id, title: assignment.title },
      lesson: lesson ? { id: lesson.id, title: lesson.title } : null,
      deadline: assignment.due_at || null,
      studyMinutes: 15,
      practiceQuestions: null
    };
  }

  if (weakLesson) {
    return {
      type: 'review',
      title: `Ôn lại ${weakLesson.lesson.title} và luyện tập thêm`,
      reason: `Con làm đúng ${weakLesson.correct}/${weakLesson.total} câu (${weakLesson.accuracy}%) ở bài này, mình cùng ôn lại nhé.`,
      lesson: { id: weakLesson.lesson.id, title: weakLesson.lesson.title },
      assignment: null,
      studyMinutes: 15,
      practiceQuestions: 5
    };
  }

  const nextLesson = publishedLessons.find((lesson) => !completed.has(lesson.id));
  if (nextLesson) {
    return {
      type: 'lesson',
      title: `Học bài tiếp theo: ${nextLesson.title}`,
      reason: 'Mình chưa thấy bài tập nào cần ưu tiên, nên hôm nay con có thể học bài tiếp theo trong chương trình.',
      lesson: { id: nextLesson.id, title: nextLesson.title },
      assignment: null,
      studyMinutes: 15,
      practiceQuestions: 5
    };
  }

  return {
    type: 'complete',
    title: 'Hôm nay con đã hoàn thành các bài học hiện có!',
    reason: 'Con có thể chọn một bài đã học để ôn lại hoặc hỏi mình về nội dung trong tài liệu.',
    lesson: null,
    assignment: null,
    studyMinutes: 15,
    practiceQuestions: null
  };
}

module.exports = { buildStudyPlan };
