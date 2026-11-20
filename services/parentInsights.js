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

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 35;

function dayKey(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftDay(key, delta) {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

function buildActivity({ attempts, submissions, completions, now }) {
  const today = dayKey(now);
  const byDay = new Map();
  const bucket = (key) => {
    if (!byDay.has(key)) byDay.set(key, { attempts: 0, submissions: 0, lessons: 0, correct: 0, total: 0 });
    return byDay.get(key);
  };
  attempts.forEach((attempt) => {
    const key = dayKey(attempt.created_at);
    if (!key || key > today) return;
    const item = bucket(key);
    item.attempts += 1;
    item.correct += Number(attempt.score) || 0;
    item.total += Number(attempt.total) || 0;
  });
  submissions.forEach((submission) => {
    const key = dayKey(submission.submitted_at);
    if (key && key <= today) bucket(key).submissions += 1;
  });
  completions.forEach((completion) => {
    const key = dayKey(completion.completed_at);
    if (key && key <= today) bucket(key).lessons += 1;
  });

  const days = [];
  for (let offset = ACTIVITY_DAYS - 1; offset >= 0; offset -= 1) {
    const date = shiftDay(today, -offset);
    const item = byDay.get(date) || { attempts: 0, submissions: 0, lessons: 0, correct: 0, total: 0 };
    days.push({
      date,
      ...item,
      activities: item.attempts + item.submissions + item.lessons,
      accuracy: item.total ? Math.round((item.correct / item.total) * 100) : null
    });
  }

  const activeKeys = [...byDay.keys()].sort();
  let longest = 0;
  let run = 0;
  activeKeys.forEach((key, index) => {
    run = index > 0 && shiftDay(activeKeys[index - 1], 1) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  let current = 0;
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);
  while (byDay.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  const countActive = (span) => days.slice(-span).filter((day) => day.activities > 0).length;
  return {
    today,
    days,
    streak: { current, longest, active_today: byDay.has(today) },
    active_days_7: countActive(7),
    active_days_30: countActive(30)
  };
}

function buildAttention(alerts) {
  if (!alerts.length) return null;
  const sorted = [...alerts].sort((left, right) => new Date(right.last_seen_at) - new Date(left.last_seen_at));
  const level = sorted.some((alert) => alert.risk_level === 'Cao') ? 'high' : 'watch';
  const reasons = [...new Set(sorted.map((alert) => alert.reason?.trim()).filter(Boolean))].slice(0, 3);
  return { level, reasons, updated_at: sorted[0].last_seen_at };
}

function buildCompletedLessons(completions, lessons) {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const items = completions
    .filter((item) => lessonById.has(item.lesson_id))
    .sort((left, right) => new Date(right.completed_at) - new Date(left.completed_at))
    .map((item) => {
      const lesson = lessonById.get(item.lesson_id);
      return { id: lesson.id, title: lesson.title, topic: lesson.topic || '', completed_at: item.completed_at };
    });
  return { count: items.length, recent: items.slice(0, 8) };
}

function buildChildInsights({
  student, classes, assignments, submissions, attempts,
  feedback = [], alerts = [], completions = [], lessons = [], now = Date.now()
}) {
  const feedbackBySubmission = new Map();
  feedback.forEach((item) => {
    const list = feedbackBySubmission.get(item.submission_id) || [];
    list.push({ id: item.id, comment: item.comment, created_at: item.created_at });
    feedbackBySubmission.set(item.submission_id, list);
  });
  feedbackBySubmission.forEach((list) => list.sort((left, right) => new Date(right.created_at) - new Date(left.created_at)));
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
        submission_id: submission?.id || null,
        score: submission ? Number(submission.score) : null,
        feedback: submission ? feedbackBySubmission.get(submission.id) || [] : [],
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
  const latestFeedback = assignmentDetails
    .flatMap((assignment) => assignment.feedback.map((item) => ({ ...item, assignment_title: assignment.title })))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
  if (latestFeedback) {
    recommendations.unshift({
      type: 'feedback',
      text: `Đọc cùng con nhận xét mới của giáo viên cho bài "${latestFeedback.assignment_title}".`
    });
  }
  const completedLessons = buildCompletedLessons(completions, lessons);
  if (!attempts.length && !assignmentDetails.length && !completedLessons.count) {
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
      total_answers: summary.total,
      completed_lesson_count: completedLessons.count
    },
    attention: buildAttention(alerts),
    activity: buildActivity({ attempts, submissions, completions, now }),
    completed_lessons: completedLessons.recent,
    trend: buildTrend(attempts),
    strengths: competencies.filter((item) => item.accuracy !== null && item.accuracy >= 80),
    needs_practice: competencies.filter((item) => item.accuracy !== null && item.accuracy < 60),
    recommendations,
    assignments: assignmentDetails.slice(0, 20),
    competencies,
    recent_attempts: [...attempts]
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .slice(0, 10)
      .map(({ id, title, chapter, score, total, created_at }) => ({ id, title, chapter, score, total, created_at }))
  };
}

module.exports = { buildChildInsights, buildActivity, dayKey };
