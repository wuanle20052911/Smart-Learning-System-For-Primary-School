const assignmentModel = require('../models/assignmentModel');
const { getSupabaseClient } = require('../models/supabaseClient');

const types = new Set(['multiple-choice', 'true-false', 'fill-blank', 'matching', 'short-answer']);

function normalize(body = {}) {
  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || !questions.length) {
    throw new Error('Bài tập cần có tên và ít nhất một câu hỏi.');
  }
  if (body.published === true && !body.class_id) {
    throw new Error('Bài tập đã xuất bản phải được giao cho một lớp.');
  }
  return {
    assignment: {
      title: body.title.trim().slice(0, 160),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '',
      lesson_id: typeof body.lesson_id === 'string' && body.lesson_id ? body.lesson_id : null,
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
      const options = Array.isArray(question.options) ? question.options : [];
      if ((question.type === 'multiple-choice' || question.type === 'true-false')
        && (options.length < 2 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= options.length
          || (question.type === 'true-false' && options.length !== 2))) {
        throw new Error(`Câu hỏi ${index + 1} cần có lựa chọn và đáp án đúng hợp lệ.`);
      }
      if ((question.type === 'fill-blank' || question.type === 'short-answer')
        && !(typeof question.answer === 'string' || typeof question.answer === 'number' ? String(question.answer).trim() : '')) {
        throw new Error(`Câu hỏi ${index + 1} cần có đáp án.`);
      }
      if (question.type === 'matching'
        && (options.length < 2
          || !options.every((pair) => pair && typeof pair.left === 'string' && pair.left.trim() && typeof pair.right === 'string' && pair.right.trim())
          || !Array.isArray(question.answer) || question.answer.length !== options.length
          || !question.answer.every((answer) => Number.isInteger(answer) && answer >= 0 && answer < options.length))) {
        throw new Error(`Câu hỏi nối cặp ${index + 1} cần có các cặp và đáp án hợp lệ.`);
      }
      return {
        skill_id: question.skill_id || null,
        type: question.type,
        question: question.question.trim(),
        options,
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
    if (payload.assignment.lesson_id) {
      const { data: lesson, error } = await getSupabaseClient(req.accessToken)
        .from('lessons')
        .select('id')
        .eq('id', payload.assignment.lesson_id)
        .eq('created_by', req.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!lesson) throw new Error('Chỉ được liên kết bài tập với bài học của giáo viên hiện tại.');
    }
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
