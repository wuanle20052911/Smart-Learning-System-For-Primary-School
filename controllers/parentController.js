const parentModel = require('../models/parentModel');
const { normalizeVietnameseMobilePhone } = require('../services/phoneNumber');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parentOnly(req, res, next) {
  if (req.profile?.role !== 'parent') {
    return res.status(403).json({ error: 'Chức năng này chỉ dành cho phụ huynh.' });
  }
  return next();
}

function studentOnly(req, res, next) {
  if (req.profile?.role !== 'student') {
    return res.status(403).json({ error: 'Chức năng này chỉ dành cho học sinh.' });
  }
  return next();
}

function adminOnly(req, res, next) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể quản lý liên kết phụ huynh–học sinh.' });
  }
  return next();
}

async function dashboard(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json(await parentModel.getDashboard(req.user.id));
  } catch (error) {
    console.error('Could not load parent dashboard:', error);
    return res.status(500).json({ error: 'Không thể tải tiến độ học tập của con.' });
  }
}

async function listLinks(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json({ links: await parentModel.listLinks() });
  } catch (error) {
    console.error('Could not list parent student links:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách liên kết phụ huynh–học sinh.' });
  }
}

async function createLink(req, res) {
  const parentId = req.body?.parent_id;
  const studentId = req.body?.student_id;
  if (typeof parentId !== 'string' || !uuidPattern.test(parentId)
    || typeof studentId !== 'string' || !uuidPattern.test(studentId)) {
    return res.status(400).json({ error: 'Tài khoản phụ huynh hoặc học sinh không hợp lệ.' });
  }
  try {
    return res.status(201).json({
      link: await parentModel.createLink(req.user.id, parentId, studentId)
    });
  } catch (error) {
    if (error.code === 'LINK_EXISTS') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_LINK') return res.status(400).json({ error: error.message });
    console.error('Could not create parent student link:', error);
    return res.status(500).json({ error: 'Không thể tạo liên kết phụ huynh–học sinh.' });
  }
}

async function removeLink(req, res) {
  const { parentId, studentId } = req.params;
  if (!uuidPattern.test(parentId) || !uuidPattern.test(studentId)) {
    return res.status(400).json({ error: 'Tài khoản phụ huynh hoặc học sinh không hợp lệ.' });
  }
  try {
    return res.json({ link: await parentModel.removeLink(parentId, studentId) });
  } catch (error) {
    if (error.code === 'LINK_NOT_FOUND') return res.status(404).json({ error: error.message });
    console.error('Could not remove parent student link:', error);
    return res.status(500).json({ error: 'Không thể gỡ liên kết phụ huynh–học sinh.' });
  }
}

async function incomingRequests(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json({ requests: await parentModel.getIncomingRequests(req.user.id) });
  } catch (error) {
    console.error('Could not load parent link requests:', error);
    return res.status(500).json({ error: 'Không thể tải yêu cầu liên kết phụ huynh–học sinh.' });
  }
}

async function myRequests(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    return res.json({ requests: await parentModel.getStudentRequests(req.user.id) });
  } catch (error) {
    console.error('Could not load student parent link requests:', error);
    return res.status(500).json({ error: 'Không thể tải trạng thái yêu cầu liên kết.' });
  }
}

async function createRequest(req, res) {
  const phoneNumber = normalizeVietnameseMobilePhone(req.body?.phoneNumber);
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Vui lòng nhập số di động Việt Nam hợp lệ.' });
  }
  try {
    const request = await parentModel.createLinkRequest(req.user.id, phoneNumber);
    return res.status(201).json({ request, message: 'Đã gửi yêu cầu. Phụ huynh có thể xác nhận trong tài khoản.' });
  } catch (error) {
    if (error.code === 'PARENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Chưa tìm thấy tài khoản phụ huynh có số này. Hãy nhờ phụ huynh cập nhật số điện thoại trong hồ sơ.' });
    }
    if (error.code === 'LINK_EXISTS' || error.code === 'REQUEST_EXISTS') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Could not create parent link request:', error);
    return res.status(500).json({ error: 'Không thể gửi yêu cầu liên kết lúc này.' });
  }
}

async function respondToRequest(req, res) {
  const { requestId } = req.params;
  const action = req.body?.action;
  if (!uuidPattern.test(requestId)) return res.status(400).json({ error: 'Yêu cầu liên kết không hợp lệ.' });
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Vui lòng chọn chấp nhận hoặc từ chối yêu cầu.' });
  try {
    return res.json({ request: await parentModel.respondToRequest(req.user.id, requestId, action) });
  } catch (error) {
    if (error.code === 'REQUEST_NOT_PENDING') return res.status(404).json({ error: 'Yêu cầu không tồn tại hoặc đã được xử lý.' });
    console.error('Could not respond to parent link request:', error);
    return res.status(500).json({ error: 'Không thể cập nhật yêu cầu liên kết.' });
  }
}

module.exports = {
  parentOnly, studentOnly, adminOnly, dashboard, listLinks, createLink, removeLink,
  incomingRequests, myRequests, createRequest, respondToRequest
};
