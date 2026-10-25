const { getSupabaseClient } = require('./supabaseClient');

async function getClassLeaderboard(accessToken) {
  const { data, error } = await getSupabaseClient(accessToken).rpc('get_student_class_leaderboard');
  if (error) throw error;
  return data || [];
}

async function completeLesson(accessToken, lessonId) {
  const { data, error } = await getSupabaseClient(accessToken).rpc('award_student_lesson_points', {
    target_lesson_id: lessonId
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

module.exports = { getClassLeaderboard, completeLesson };
