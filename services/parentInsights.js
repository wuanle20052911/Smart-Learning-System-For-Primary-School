function sumAccuracy(attempts) {
  const correct = attempts.reduce((sum, attempt) => sum + (Number(attempt.score) || 0), 0);
  const total = attempts.reduce((sum, attempt) => sum + (Number(attempt.total) || 0), 0);
  return { correct, total, accuracy: total ? Math.round((correct / total) * 100) : null };
}

function buildTrend(attempts) {
  const sorted = [...attempts].sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
  if (sorted.length < 2) return null;

  const split = Math.ceil(sorted.length / 2);
  const previous = sumAccuracy(sorted.slice(0, split)).accuracy;
  const current = sumAccuracy(sorted.slice(split)).accuracy;
  if (previous === null || current === null) return null;

  const change = current - previous;
  return {
    direction: change >= 5 ? 'improving' : change <= -5 ? 'declining' : 'stable',
    change: Math.round(change)
  };
}

function buildChildInsights({ student, classes, assignments, submissions, attempts, now = Date.now() }) {
  const classIds = new Set(classes.map((item) => item.id));
  const visibleAssignments = assignments
    .filter((assignment) => assignment.published && classIds.has(assignment.class_id));
  const assignmentById = new Map(visibleAssignments.map((assignment) => [assignment.id, assignment]));
  const validSubmissions = submissions.filter((submission) => {
    const assignment = assignmentById.get(submission.assignment_id);
    if (!assignment) return false;
    return !assignment.due_at || new Date(submission.submitted_at).getTime() <= new Date(assignment.due_at).getTime();
  });
  const latestSubmissionByAssignment = new Map();
  validSubmissions
    .sort((left, right) => new Date(right.submitted_at) - new Date(left.submitted_at))
    .forEach((submission) => {
      if (!latestSubmissionByAssignment.has(submission.assignment_id)) {
        latestSubmissionByAssignment.set(submission.assignment_id, submission);
      }
    });

  const assignmentDetails = visibleAssignments
    .map((assignment) => {
      const submission = latestSubmissionByAssignment.get(assignment.id);
      const overdue = assignment.due_at && new Date(assignment.due_at).getTime() < now;
      return {
        id: assignment.id,
        title: assignment.title,
        due_at: assignment.due_at,
        submitted_at: submission?.submitted_at || null,
        score: submission ? Number(submission.score) : null,
        status: submission ? 'submitted' : overdue ? 'overdue' : 'pending'
      };
    })
    .sort((left, right) => {
      const leftDate = left.due_at ? new Date(left.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.due_at ? new Date(right.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate || left.title.localeCompare(right.title, 'vi');
    });

  const competencyMap = new Map();
  attempts.forEach((attempt) => {
    const title = attempt.title?.trim() || 'Bài luyện tập';
    const chapter = attempt.chapter?.trim() || 'Chưa phân chương';
    const key = `${chapter}\u0000${title}`;
    const item = competencyMap.get(key) || { title, chapter, attempts: 0, correct: 0, total: 0, latest_at: attempt.created_at };
    item.attempts += 1;
    item.correct += Number(attempt.score) || 0;
    item.total += Number(attempt.total) || 0;
    if (new Date(attempt.created_at) > new Date(item.latest_at)) item.latest_at = attempt.created_at;
    competencyMap.set(key, item);
  });

  const competencies = [...competencyMap.values()]
    .map((item) => ({ ...item, accuracy: item.total ? Math.round((item.correct / item.total) * 100) : null }))
    .sort((left, right) => left.chapter.localeCompare(right.chapter, 'vi') || left.title.localeCompare(right.title, 'vi'));
  const summary = sumAccuracy(attempts);
  const submittedCount = assignmentDetails.filter((item) => item.status === 'submitted').length;
  const recommendations = [];

  assignmentDetails.filter((item) => item.status !== 'submitted').slice(0, 2).forEach((assignment) => {
    recommendations.push({
      type: 'assignment',
      text: assignment.status === 'overdue'
        ? `Bài "${assignment.title}" đang quá hạn; hãy trao đổi với giáo viên về cách hoàn thành.`
        : `Cùng con lên kế hoạch hoàn thành bài "${assignment.title}".`
    });
  });
  competencies.filter((item) => item.accuracy !== null && item.accuracy < 60).slice(0, 3).forEach((item) => {
    recommendations.push({
      type: 'practice',
      text: `Có thể ôn thêm "${item.title}" (${item.chapter}); kết quả hiện tại là ${item.accuracy}%.`
    });
  });
  if (!attempts.length && !assignmentDetails.length) {
    recommendations.push({ type: 'data', text: 'Chưa có đủ dữ liệu học tập để đưa ra khuyến nghị.' });
  }

  return {
    student: {
      id: student.id,
      full_name: student.full_name,
      classes: classes.map(({ id, name, grade }) => ({ id, name, grade }))
    },
    summary: {
      assigned_count: assignmentDetails.length,
      submitted_count: submittedCount,
      completion_rate: assignmentDetails.length ? Math.round((submittedCount / assignmentDetails.length) * 100) : null,
      attempt_count: attempts.length,
      accuracy: summary.accuracy,
      correct_answers: summary.correct,
      total_answers: summary.total
    },
    trend: buildTrend(attempts),
    strengths: competencies.filter((item) => item.accuracy !== null && item.accuracy >= 80),
    needs_practice: competencies.filter((item) => item.accuracy !== null && item.accuracy < 60),
    recommendations,
    assignments: assignmentDetails.slice(0, 20),
    competencies,
    recent_attempts: [...attempts]
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .slice(0, 10)
      .map(({ title, chapter, score, total, created_at }) => ({ title, chapter, score, total, created_at }))
  };
}

module.exports = { buildChildInsights };
