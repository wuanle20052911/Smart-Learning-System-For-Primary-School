const lessonModel = require('../models/lessonModel');

const colors = new Set(['blue', 'yellow', 'green', 'pink']);

function normalizeLesson(body = {}) {
  const lesson = {
    title: typeof body.title === 'string' ? body.title.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    subject: typeof body.subject === 'string' ? body.subject.trim() : 'Toán',
    grade: typeof body.grade === 'string' ? body.grade.trim() : 'Tiểu học',
    topic: typeof body.topic === 'string' ? body.topic.trim() : '',
    content: typeof body.content === 'string' ? body.content.trim().slice(0, 18000) : '',
    source_filename: typeof body.source_filename === 'string' ? body.source_filename.trim().slice(0, 255) : null,
    icon: typeof body.icon === 'string' ? body.icon.trim() : '📚',
    color: colors.has(body.color) ? body.color : 'blue',
    published: body.published === true
  };
  if (lesson.title.length < 2 || lesson.title.length > 120) {
    throw new Error('Tên bài học phải dài từ 2 đến 120 ký tự.');
  }
  return lesson;
}

function teacherOnly(req, res, next) {
  if (!['teacher', 'admin'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền quản lý bài học.' });
  }
  return next();
}

async function listPublished(req, res) {
  try {
    return res.json({ lessons: await lessonModel.listPublished(req.accessToken) });
  } catch (error) {
    console.error('Could not list published lessons:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách bài học.' });
  }
}

async function listMine(req, res) {
  try {
    return res.json({ lessons: await lessonModel.listForTeacher(req.accessToken, req.user.id) });
  } catch (error) {
    console.error('Could not list teacher lessons:', error);
    return res.status(500).json({ error: 'Không thể tải bài học của giáo viên.' });
  }
}

async function create(req, res) {
  try {
    return res.status(201).json({
      lesson: await lessonModel.create(req.accessToken, req.user.id, normalizeLesson(req.body))
    });
  } catch (error) {
    console.error('Could not create lesson:', error);
    return res.status(400).json({
      error: error.message || 'Không thể tạo bài học.',
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function update(req, res) {
  try {
    return res.json({
      lesson: await lessonModel.update(req.accessToken, req.user.id, req.params.id, normalizeLesson(req.body))
    });
  } catch (error) {
    console.error('Could not update lesson:', error);
    return res.status(400).json({
      error: error.message || 'Không thể cập nhật bài học.',
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

async function remove(req, res) {
  try {
    await lessonModel.remove(req.accessToken, req.user.id, req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Could not delete lesson:', error);
    return res.status(400).json({ error: 'Không thể xoá bài học.' });
  }
}

module.exports = { listPublished, listMine, teacherOnly, create, update, remove };
