const { getAdminAIUsageSummary } = require('../services/aiUsage');

async function getSummary(req, res) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên mới được xem thống kê AI.' });
  }

  try {
    const summary = await getAdminAIUsageSummary();
    return res.json({ periodDays: 30, summary });
  } catch (error) {
    console.error('Could not load admin AI usage summary:', error);
    return res.status(500).json({ error: error.message || 'Không thể tải thống kê AI.' });
  }
}

module.exports = { getSummary };
