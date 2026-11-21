import catalog from '../../../services/lessonGames.json';

export const LESSON_GAMES = catalog;
export const MAX_LESSON_GAMES = 6;

const gamesBySlug = new Map(catalog.map((game) => [game.slug, game]));

// Giữ đúng thứ tự giáo viên đã chọn, bỏ qua slug không còn trong danh mục.
export function getLessonGames(slugs) {
  return (Array.isArray(slugs) ? slugs : []).map((slug) => gamesBySlug.get(slug)).filter(Boolean);
}
