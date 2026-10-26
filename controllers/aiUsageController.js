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

async function streamSummary(req, res) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên mới được xem thống kê AI.' });
  }

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 5000\n\n');

  let closed = false;
  let refreshing = false;
  const sendSummary = async () => {
    if (closed || refreshing) return;
    refreshing = true;
    try {
      const summary = await getAdminAIUsageSummary();
      if (!closed) res.write(`event: usage\ndata: ${JSON.stringify({ periodDays: 30, summary })}\n\n`);
    } catch (error) {
      console.error('Could not stream admin AI usage summary:', error);
      if (!closed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Không thể cập nhật thống kê AI.' })}\n\n`);
        res.end();
      }
    } finally {
      refreshing = false;
    }
  };

  const interval = setInterval(sendSummary, 10000);
  res.on('close', () => {
    closed = true;
    clearInterval(interval);
  });
  await sendSummary();
}

module.exports = { getSummary, streamSummary };
