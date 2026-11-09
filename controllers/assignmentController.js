const assignmentModel = require('../models/assignmentModel');
const catalogModel = require('../models/catalogModel');
const questionBankModel = require('../models/questionBankModel');
const quizAttemptModel = require('../models/quizAttemptModel');
const { getSupabaseClient } = require('../models/supabaseClient');
const { normalizeDueAt } = require('../services/assignmentDeadline');
const { buildPersonalizedDraft } = require('../services/personalizedAssignment');

function normalize(body = {}) {
  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || !questions.length) {
    throw new Error('Bài tập cần có tên và ít nhất một câu hỏi.');
  }
  if (body.published === true && !body.class_id) {
    throw new Error('Bài tập đã xuất bản phải được giao cho một lớp.');
  }
  const targetStudentId = typeof body.target_student_id === 'string' && body.target_student_id ? body.target_student_id : null;
  const learningGoal = typeof body.learning_goal === 'string' ? body.learning_goal.trim().slice(0, 500) : '';
  if (targetStudentId && (!body.class_id || !learningGoal)) {
    throw new Error('Bài tập cá nhân hóa cần lớp học và mục tiêu học tập.');
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
      target_student_id: targetStudentId,
      learning_goal: learningGoal,
      difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'easy',
      due_at: normalizeDueAt(body.due_at, body.published === true),
      published: body.published === true
    },
    questions: questions.map((question, index) => {
      if (question.type !== 'multiple-choice' || typeof question.question !== 'string' || !question.question.trim()) {
        throw new Error(`Câu hỏi ${index + 1}: chỉ hỗ trợ câu trắc nghiệm.`);
      }
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length !== 4 || !options.every((option) => typeof option === 'string' && option.trim())
        || new Set(options.map((option) => option.trim().toLocaleLowerCase('vi-VN'))).size !== 4
        || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= options.length) {
        throw new Error(`Câu hỏi ${index + 1} cần có lựa chọn và đáp án đúng hợp lệ.`);
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
    if (payload.assignment.target_student_id) {
      if (!payload.assignment.class_id) throw new Error('Bài tập cá nhân hóa phải được giao trong một lớp.');
      if (!payload.assignment.learning_goal) throw new Error('Bài tập cá nhân hóa cần có mục tiêu học tập.');
      const client = getSupabaseClient(req.accessToken);
      const students = req.profile.role === 'admin'
        ? await catalogModel.managerListClassStudents(client, payload.assignment.class_id)
        : await catalogModel.listClassStudents(client, payload.assignment.class_id);
      if (!students.some((student) => (student.id || student.student_id) === payload.assignment.target_student_id)) {
        throw new Error('Học sinh được chọn không thuộc lớp này.');
      }
    }
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

async function createPersonalizedDraft(req, res) {
  const classId = typeof req.body?.class_id === 'string' ? req.body.class_id : '';
  const studentId = typeof req.body?.student_id === 'string' ? req.body.student_id : '';
  if (!classId || !studentId) {
    return res.status(400).json({ error: 'Hãy chọn lớp và học sinh cần ôn tập.' });
  }
  try {
    const client = getSupabaseClient(req.accessToken);
    const students = req.profile.role === 'admin'
      ? await catalogModel.managerListClassStudents(client, classId)
      : await catalogModel.listClassStudents(client, classId);
    if (!students.some((student) => (student.id || student.student_id) === studentId)) {
      return res.status(400).json({ error: 'Học sinh được chọn không thuộc lớp này.' });
    }
    const [attempts, bankQuestions] = await Promise.all([
      quizAttemptModel.listForTeacherStudent(req.accessToken, req.user.id, studentId),
      questionBankModel.list(req.accessToken, req.user.id)
    ]);
    return res.json(buildPersonalizedDraft(attempts, bankQuestions));
  } catch (error) {
    console.error('Could not build personalized assignment draft:', error);
    return res.status(500).json({ error: 'Không thể phân tích kết quả và ngân hàng câu hỏi.' });
  }
}

async function listMine(req, res) {
  try { return res.json({ assignments: await assignmentModel.listForTeacher(req.accessToken, req.user.id) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải bài tập.' }); }
}

async function listPublished(req, res) {
  try { return res.json({ assignments: await assignmentModel.listForStudent(req.accessToken, req.user.id) }); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Không thể tải bài tập được giao.' }); }
}

async function getOne(req, res) {
  try { return res.json({ assignment: await assignmentModel.getWithQuestions(req.accessToken, req.params.id) }); }
  catch (error) { console.error(error); return res.status(404).json({ error: 'Không tìm thấy bài tập.' }); }
}

module.exports = { normalize, create, createPersonalizedDraft, listMine, listPublished, getOne, teacherOnly };
