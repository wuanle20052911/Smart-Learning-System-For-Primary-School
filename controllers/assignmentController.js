const assignmentModel = require('../models/assignmentModel');

const types = new Set(['multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer']);

function normalize(body = {}) {
  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || !questions.length) {
    throw new Error('Bài tập cần có tên và ít nhất một câu hỏi.');
  }
  return {
    assignment: {
      title: body.title.trim().slice(0, 160),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '',
      subject_id: body.subject_id || null,
      topic_id: body.topic_id || null,
      skill_id: body.skill_id || null,
      class_id: body.class_id || null,
      difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'easy',
      due_at: body.due_at || null,
      published: body.published === true
    },
    questions: questions.map((question, index) => {
      if (!types.has(question.type) || typeof question.question !== 'string' || !question.question.trim()) {
        throw new Error(`Câu hỏi ${index + 1} không hợp lệ.`);
      }
      return {
        skill_id: question.skill_id || null,
        type: question.type,
        question: question.question.trim(),
        options: Array.isArray(question.options) ? question.options : [],
        answer: question.answer,
        explanation: typeof question.explanation === 'string' ? question.explanation : '',
        points: Number.isInteger(question.points) && question.points > 0 ? question.points : 1
      };
    })
  };
}

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền quản lý bài tập.' });
  return next();
}

async function create(req, res) {
  try {
    const payload = normalize(req.body);
    return res.status(201).json({ assignment: await assignmentModel.create(req.accessToken, req.user.id, payload.assignment, payload.questions) });
  } catch (error) {
    console.error('Could not create assignment:', error);
    return res.status(400).json({ error: error.message || 'Không thể tạo bài tập.' });
  }
}

async function listMine(req, res) {
  try { return res.json({ assignments: await assignmentModel.listForTeacher(req.accessToken, req.user.id) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải bài tập.' }); }
}

async function listPublished(req, res) {
  try { return res.json({ assignments: await assignmentModel.listForStudent(req.accessToken) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải bài tập được giao.' }); }
}

async function getOne(req, res) {
  try { return res.json({ assignment: await assignmentModel.getWithQuestions(req.accessToken, req.params.id) }); }
  catch (error) { console.error(error); return res.status(404).json({ error: 'Không tìm thấy bài tập.' }); }
}

module.exports = { create, listMine, listPublished, getOne, teacherOnly };
