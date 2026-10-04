const assignmentModel = require('../models/assignmentModel');
const submissionModel = require('../models/submissionModel');
const { isAssignmentClosed } = require('../services/assignmentDeadline');

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
}

function isCorrect(question, answer) {
  if (question.type === 'multiple-choice' || question.type === 'true-false') return Number(answer) === Number(question.answer);
  if (question.type === 'matching') return JSON.stringify(answer) === JSON.stringify(question.answer);
  const accepted = [question.answer, ...(Array.isArray(question.answer) ? question.answer : [])].flat().filter((item) => item !== null && item !== undefined).map(normalizeAnswer);
  return accepted.includes(normalizeAnswer(answer));
}

async function create(req, res) {
  try {
    const assignment = await assignmentModel.getWithQuestions(req.accessToken, req.body?.assignment_id);
    if (isAssignmentClosed(assignment)) {
      const error = new Error('Bài tập đã hết hạn và không nhận bài nộp nữa.');
      error.code = 'ASSIGNMENT_CLOSED';
      throw error;
    }
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const correctCount = assignment.questions.reduce((count, question, index) => count + (isCorrect(question, answers[index]) ? 1 : 0), 0);
    const totalQuestions = assignment.questions.length;
    const score = Math.round((correctCount / totalQuestions) * 10000) / 100;
    const submission = await submissionModel.create(req.accessToken, req.user.id, assignment.id, answers, {
      score, correct_count: correctCount, total_questions: totalQuestions
    });
    return res.status(201).json({ submission, score, correctCount, totalQuestions });
  } catch (error) {
    console.error('Could not submit assignment:', error);
    const status = ['ALREADY_SUBMITTED', 'ASSIGNMENT_CLOSED'].includes(error.code) ? 409 : 400;
    return res.status(status).json({ error: error.message || 'Không thể nộp bài tập.' });
  }
}

async function listForStudent(req, res) {
  try { return res.json({ submissions: await submissionModel.listForStudent(req.accessToken, req.user.id) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải lịch sử bài tập.' }); }
}

async function listForTeacher(req, res) {
  try { return res.json({ submissions: await submissionModel.listForTeacher(req.accessToken, req.user.id) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải kết quả bài tập.' }); }
}

async function getForTeacher(req, res) {
  try { return res.json({ submission: await submissionModel.getForTeacher(req.accessToken, req.user.id, req.params.id) }); }
  catch (error) { console.error('Could not load teacher submission:', error); return res.status(404).json({ error: 'Không tìm thấy bài nộp hoặc bạn không có quyền xem.' }); }
}

async function addFeedback(req, res) {
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!comment) return res.status(400).json({ error: 'Nhận xét không được để trống.' });
  try {
    return res.status(201).json({
      feedback: await submissionModel.addFeedback(req.accessToken, req.user.id, req.params.id, comment)
    });
  } catch (error) {
    console.error('Could not create feedback:', error);
    return res.status(400).json({ error: error.message || 'Không thể lưu nhận xét.' });
  }
}

module.exports = { create, listForStudent, listForTeacher, getForTeacher, addFeedback };
