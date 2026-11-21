const messageModel = require('../models/messageModel');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const viewerOf = (req) => ({ id: req.user.id, role: req.profile?.role });

function parentOrTeacher(req, res, next) {
  if (!['parent', 'teacher'].includes(req.profile?.role)) {
    return res.status(403).json({ error: 'Tin nhắn chỉ dành cho phụ huynh và giáo viên.' });
  }
  return next();
}

function handleError(res, error, fallback) {
  if (error.code === 'FORBIDDEN') return res.status(403).json({ error: error.message });
  if (error.code === 'INVALID_MESSAGE') return res.status(400).json({ error: error.message });
  if (['42P01', 'PGRST205'].includes(error.code)) {
    console.error('Messaging table missing:', error);
    return res.status(503).json({ error: 'Quản trị viên cần chạy migration supabase/042_parent_teacher_messages.sql để bật tin nhắn.' });
  }
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

function validIds(req, res) {
  const { studentId, otherId } = req.params;
  if (!uuidPattern.test(studentId) || !uuidPattern.test(otherId)) {
    res.status(400).json({ error: 'Cuộc trò chuyện không hợp lệ.' });
    return false;
  }
  return true;
}

async function threads(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json({ threads: await messageModel.listThreads(viewerOf(req)) });
  } catch (error) {
    return handleError(res, error, 'Không thể tải danh sách tin nhắn.');
  }
}

async function unread(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json({ unread: await messageModel.countUnread(viewerOf(req)) });
  } catch (error) {
    return handleError(res, error, 'Không thể tải số tin nhắn chưa đọc.');
  }
}

async function thread(req, res) {
  res.set('Cache-Control', 'no-store');
  if (!validIds(req, res)) return undefined;
  try {
    return res.json(await messageModel.getThread(viewerOf(req), req.params.studentId, req.params.otherId));
  } catch (error) {
    return handleError(res, error, 'Không thể tải cuộc trò chuyện.');
  }
}

async function send(req, res) {
  if (!validIds(req, res)) return undefined;
  try {
    const message = await messageModel.sendMessage(viewerOf(req), req.params.studentId, req.params.otherId, req.body?.body);
    return res.status(201).json({ message });
  } catch (error) {
    return handleError(res, error, 'Không thể gửi tin nhắn.');
  }
}

module.exports = { parentOrTeacher, threads, unread, thread, send };
