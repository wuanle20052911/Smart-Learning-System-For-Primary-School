const { getAIFeaturesEnabled, setAIFeaturesEnabled } = require('../services/aiFeatureSettings');

function adminOnly(req, res) {
  if (req.profile?.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ quản trị viên mới được thay đổi cài đặt AI.' });
    return false;
  }
  return true;
}

async function getSettings(req, res) {
  if (!adminOnly(req, res)) return;
  try {
    return res.json({ enabled: await getAIFeaturesEnabled() });
  } catch (error) {
    console.error('Could not load AI feature settings:', error);
    return res.status(503).json({ error: error.message || 'Không thể tải cài đặt AI.' });
  }
}

async function updateSettings(req, res) {
  if (!adminOnly(req, res)) return;
  if (typeof req.body?.enabled !== 'boolean') {
    return res.status(400).json({ error: 'Trạng thái AI phải là true hoặc false.' });
  }
  try {
    const enabled = await setAIFeaturesEnabled(req.body.enabled, req.user.id);
    return res.json({ enabled, message: enabled ? 'Đã bật các chức năng AI.' : 'Đã tắt các chức năng AI.' });
  } catch (error) {
    console.error('Could not update AI feature settings:', error);
    return res.status(503).json({ error: error.message || 'Không thể cập nhật cài đặt AI.' });
  }
}

module.exports = { getSettings, updateSettings };
