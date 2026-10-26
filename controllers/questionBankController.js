const questionBankModel = require('../models/questionBankModel');
const { getSupabaseClient } = require('../models/supabaseClient');

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền quản lý ngân hàng câu hỏi.' });
  }
  return next();
}

function studentOnly(req, res, next) {
  if (req.profile?.role !== 'student') {
    return res.status(403).json({ error: 'Chỉ học sinh mới có thể luyện tập câu hỏi.' });
  }
  return next();
}

function normalize(body = {}) {
  if (body.type !== 'multiple-choice' || typeof body.question !== 'string' || !body.question.trim()
    || !Array.isArray(body.options) || body.options.length !== 4
    || !body.options.every((option) => typeof option === 'string' && option.trim())
    || new Set(body.options.map((option) => option.trim().toLocaleLowerCase('vi-VN'))).size !== 4
    || !Number.isInteger(body.answer) || body.answer < 0 || body.answer >= 4) {
    throw new Error('Chỉ hỗ trợ tạo câu trắc nghiệm có 4 lựa chọn và đáp án hợp lệ.');
  }
  return {
    question_key: typeof body.question_key === 'string' && body.question_key.trim()
      ? body.question_key.trim().slice(0, 80)
      : undefined,
    lesson_id: typeof body.lesson_id === 'string' && body.lesson_id ? body.lesson_id : null,
    skill_id: body.skill_id || null,
    type: body.type,
    content: body.question.trim().slice(0, 2000),
    options: Array.isArray(body.options) ? body.options : [],
    answer: body.answer,
    explanation: typeof body.explanation === 'string' ? body.explanation.trim().slice(0, 2000) : '',
    points: Number.isInteger(body.points) && body.points > 0 ? body.points : 1
  };
}

async function list(req, res) {
  try {
    return res.json({ questions: await questionBankModel.list(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list question bank:', error);
    return res.status(500).json({ error: 'Không thể tải ngân hàng câu hỏi.' });
  }
}

async function listForLesson(req, res) {
  try {
    const { data: lesson, error } = await getSupabaseClient(req.accessToken)
      .from('lessons')
      .select('id')
      .eq('id', req.params.lessonId)
      .eq('published', true)
      .maybeSingle();
    if (error) throw error;
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học đã xuất bản.' });

    return res.json({
      questions: await questionBankModel.listForLesson(req.accessToken, lesson.id)
    });
  } catch (error) {
    console.error('Could not list practice questions for lesson:', error);
    return res.status(500).json({ error: 'Không thể tải câu hỏi luyện tập của bài học.' });
  }
}

async function create(req, res) {
  try {
    const question = normalize(req.body);
    if (question.lesson_id) {
      const { data: lesson, error } = await getSupabaseClient(req.accessToken)
        .from('lessons')
        .select('id')
        .eq('id', question.lesson_id)
        .eq('created_by', req.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!lesson) throw new Error('Chỉ được liên kết câu hỏi với bài học của giáo viên hiện tại.');
    }
    return res.status(201).json({ question: await questionBankModel.create(req.accessToken, req.user.id, question) });
  } catch (error) {
    console.error('Could not create question bank item:', error);
    return res.status(400).json({ error: error.message || 'Không thể lưu câu hỏi.' });
  }
}

async function remove(req, res) {
  try {
    await questionBankModel.remove(req.accessToken, req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Could not delete question bank item:', error);
    return res.status(500).json({ error: 'Không thể xóa câu hỏi.' });
  }
}

module.exports = { teacherOnly, studentOnly, normalize, list, listForLesson, create, remove };
