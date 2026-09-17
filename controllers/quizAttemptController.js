const quizAttemptModel = require('../models/quizAttemptModel');

function normalizeAttempt(body = {}) {
  const score = Number(body.score);
  const total = Number(body.total);
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const incorrectAnswers = Array.isArray(body.incorrect_answers) ? body.incorrect_answers : [];
  const attempt = {
    lesson_id: typeof body.lesson_id === 'string' && body.lesson_id ? body.lesson_id : null,
    title: typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '',
    grade: typeof body.grade === 'string' && body.grade.trim() ? body.grade.trim().slice(0, 80) : 'Tiểu học',
    chapter: typeof body.chapter === 'string' && body.chapter.trim() ? body.chapter.trim().slice(0, 120) : 'Luyện tập nhanh',
    score,
    total,
    questions,
    incorrect_answers: incorrectAnswers
  };

  if (!attempt.title || !Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total
    || questions.length !== total || incorrectAnswers.length !== total - score) {
    throw new Error('Kết quả bài làm không hợp lệ.');
  }
  return attempt;
}

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền xem kết quả học sinh.' });
  }
  return next();
}

async function create(req, res) {
  try {
    return res.status(201).json({
      attempt: await quizAttemptModel.create(
        req.accessToken,
        req.user.id,
        req.profile,
        normalizeAttempt(req.body)
      )
    });
  } catch (error) {
    console.error('Could not save quiz attempt:', error);
    return res.status(400).json({ error: error.message || 'Không thể lưu kết quả bài làm.' });
  }
}

async function listMine(req, res) {
  try {
    return res.json({ attempts: await quizAttemptModel.listForStudent(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list student quiz attempts:', error);
    return res.status(500).json({ error: 'Không thể tải lịch sử làm bài.' });
  }
}

async function listForTeacher(req, res) {
  try {
    return res.json({ attempts: await quizAttemptModel.listForTeacher(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list teacher quiz attempts:', error);
    return res.status(500).json({ error: 'Không thể tải kết quả học sinh.' });
  }
}

async function analyticsForTeacher(req, res) {
  try {
    const attempts = await quizAttemptModel.listForTeacher(req.accessToken, req.user.id);
    const byStudent = new Map();
    attempts.forEach((attempt) => {
      const current = byStudent.get(attempt.student_id) || {
        student_id: attempt.student_id,
        student_name: attempt.student_name || 'Học sinh chưa cập nhật',
        student_email: attempt.student_email,
        attempts: 0,
        scoreSum: 0,
        answered: 0,
        total: 0,
        lastAttemptAt: attempt.created_at
      };
      current.attempts += 1;
      current.scoreSum += attempt.total ? (attempt.score / attempt.total) * 100 : 0;
      current.answered += attempt.score;
      current.total += attempt.total;
      if (new Date(attempt.created_at) > new Date(current.lastAttemptAt)) current.lastAttemptAt = attempt.created_at;
      byStudent.set(attempt.student_id, current);
    });

    const students = [...byStudent.values()].map((student) => {
      const averageScore = student.attempts ? Math.round((student.scoreSum / student.attempts) * 10) / 10 : 0;
      const completionRate = student.total ? Math.round((student.answered / student.total) * 100) : 0;
      const risk = averageScore < 50 || completionRate < 60 ? 'Cao' : averageScore < 65 || completionRate < 80 ? 'Theo dõi' : 'Ổn định';
      return { ...student, averageScore, completionRate, risk };
    }).sort((a, b) => a.averageScore - b.averageScore);

    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.total ? (attempt.score / attempt.total) * 100 : 0), 0) / totalAttempts * 10) / 10
      : 0;
    const correctAnswers = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
    return res.json({
      overview: {
        studentCount: students.length,
        attemptCount: totalAttempts,
        averageScore,
        accuracyRate: totalQuestions ? Math.round(correctAnswers / totalQuestions * 1000) / 10 : 0,
        supportCount: students.filter((student) => student.risk === 'Cao').length
      },
      students,
      recentAttempts: attempts.slice(0, 20)
    });
  } catch (error) {
    console.error('Could not build teacher analytics:', error);
    return res.status(500).json({ error: 'Không thể tải dữ liệu phân tích học tập.' });
  }
}

module.exports = { create, listMine, listForTeacher, analyticsForTeacher, teacherOnly };
