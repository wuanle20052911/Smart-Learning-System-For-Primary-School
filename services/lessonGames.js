const catalog = require('./lessonGames.json');

const MAX_LESSON_GAMES = 6;
const knownSlugs = new Set(catalog.map((game) => game.slug));

// Trả về undefined khi request không gửi game_slugs, để cập nhật bài học không xóa game đã chọn.
function normalizeGameSlugs(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error('Danh sách trò chơi không hợp lệ.');
  const slugs = [...new Set(value.map((slug) => (typeof slug === 'string' ? slug.trim() : '')))];
  if (slugs.some((slug) => !knownSlugs.has(slug))) throw new Error('Có trò chơi không tồn tại trong danh mục.');
  if (slugs.length > MAX_LESSON_GAMES) throw new Error(`Mỗi bài học chỉ gắn tối đa ${MAX_LESSON_GAMES} trò chơi.`);
  return slugs;
}

module.exports = { catalog, MAX_LESSON_GAMES, normalizeGameSlugs };
