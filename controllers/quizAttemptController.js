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

module.exports = { create, listMine, listForTeacher, teacherOnly };
