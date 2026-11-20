const lessonModel = require('../models/lessonModel');
const { getAIFeaturesEnabled } = require('../services/aiFeatureSettings');
const { recordAIUsage } = require('../services/aiUsage');
const { VERSION, validateLessonInput, generateStoryAdventure } = require('../services/storyAdventure');

async function generate(req, res) {
  if (req.profile?.role !== 'student') {
    return res.status(403).json({ error: 'Truyện và minigame AI chỉ dành cho học sinh.' });
  }
  try {
    if (!await getAIFeaturesEnabled()) {
      return res.status(503).json({ error: 'Các chức năng AI hiện đang được quản trị viên tắt.' });
    }
  } catch (error) {
    console.error('Could not check AI feature settings:', error);
    return res.status(503).json({ error: 'Không thể xác nhận trạng thái AI. Vui lòng thử lại sau.' });
  }
  const lessonId = typeof req.body?.lessonId === 'string' ? req.body.lessonId.trim() : '';
  if (!lessonId || lessonId.length > 120) {
    return res.status(400).json({ error: 'Bài học không hợp lệ.' });
  }
  const startedAt = Date.now();
  const telemetry = { model: null, promptTokens: 0, completionTokens: 0 };
  try {
    let lessons;
    try {
      lessons = await lessonModel.listPublished(req.accessToken);
    } catch (error) {
      console.error('Could not load a published lesson for story generation:', error);
      return res.status(500).json({ error: 'Không thể tải bài học lúc này.' });
    }
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return res.status(404).json({ error: 'Không tìm thấy bài học đã xuất bản.' });
    let input;
    try {
      input = validateLessonInput(lesson);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const adventure = await generateStoryAdventure(input, {
      onUsage(event) {
        telemetry.model = event.model;
        telemetry.promptTokens += event.promptTokens;
        telemetry.completionTokens += event.completionTokens;
      }
    });
    return res.json({ adventure });
  } catch (error) {
    console.error('Story adventure generation failed:', error);
    return res.status(error.code === 'STORY_TIMEOUT' ? 504 : 502).json({
      error: error.message === 'fetch failed'
        ? 'Không thể kết nối tới Ollama. Kiểm tra dịch vụ và model, rồi thử lại.'
        : error.message
    });
  } finally {
    await recordAIUsage({
      userId: req.user.id,
      feature: 'story-adventure',
      promptVersion: VERSION,
      model: telemetry.model,
      promptTokens: telemetry.promptTokens,
      completionTokens: telemetry.completionTokens,
      latencyMs: Date.now() - startedAt,
      tools: ['story-generation', 'mini-game-generation'],
      statusCode: res.statusCode
    });
  }
}

module.exports = { generate };
