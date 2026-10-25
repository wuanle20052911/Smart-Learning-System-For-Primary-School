const leaderboardModel = require('../models/leaderboardModel');

async function getClassLeaderboard(req, res) {
  if (req.profile?.role !== 'student') {
    return res.status(403).json({ error: 'Bảng xếp hạng chỉ dành cho học sinh.' });
  }

  try {
    return res.json({
      leaderboard: await leaderboardModel.getClassLeaderboard(req.accessToken)
    });
  } catch (error) {
    console.error('Could not load class leaderboard:', error);
    return res.status(500).json({ error: 'Không thể tải bảng xếp hạng lớp.' });
  }
}

async function completeLesson(req, res) {
  if (req.profile?.role !== 'student') {
    return res.status(403).json({ error: 'Chỉ học sinh mới được ghi nhận điểm học tập.' });
  }

  const lessonId = req.body?.lessonId;
  if (typeof lessonId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lessonId)) {
    return res.status(400).json({ error: 'Mã bài học không hợp lệ.' });
  }

  try {
    const completion = await leaderboardModel.completeLesson(req.accessToken, lessonId);
    return res.json({ completion });
  } catch (error) {
    console.error('Could not record lesson completion points:', error);
    return res.status(500).json({ error: 'Không thể ghi nhận điểm hoàn thành bài học.' });
  }
}

module.exports = { getClassLeaderboard, completeLesson };
