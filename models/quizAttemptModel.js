const { getSupabaseClient } = require('./supabaseClient');

const attemptFields = 'id,student_id,lesson_id,student_name,student_email,title,grade,chapter,score,total,questions,incorrect_answers,created_at';

async function create(accessToken, studentId, profile, attempt) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('quiz_attempts')
    .insert({
      ...attempt,
      student_id: studentId,
      student_name: profile.full_name,
      student_email: profile.email
    })
    .select(attemptFields)
    .single();
  if (error) throw error;
  return data;
}

async function listForStudent(accessToken, studentId) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('quiz_attempts')
    .select(attemptFields)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

async function listForTeacher(accessToken, teacherId) {
  const client = getSupabaseClient(accessToken);
  const { data: lessons, error: lessonsError } = await client
    .from('lessons')
    .select('id')
    .eq('created_by', teacherId);
  if (lessonsError) throw lessonsError;

  const lessonIds = lessons.map((lesson) => lesson.id);
  if (!lessonIds.length) return [];

  const { data, error } = await client
    .from('quiz_attempts')
    .select(attemptFields)
    .in('lesson_id', lessonIds)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

async function listForTeacherStudent(accessToken, teacherId, studentId) {
  const client = getSupabaseClient(accessToken);
  const { data: lessons, error: lessonsError } = await client
    .from('lessons')
    .select('id,title')
    .eq('created_by', teacherId);
  if (lessonsError) throw lessonsError;

  const lessonIds = lessons.map((lesson) => lesson.id);
  if (!lessonIds.length) return [];

  const { data, error } = await client
    .from('quiz_attempts')
    .select('id,lesson_id,title,grade,chapter,score,total,created_at')
    .in('lesson_id', lessonIds)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const lessonTitles = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));
  return data.map((attempt) => ({
    ...attempt,
    lesson_title: lessonTitles.get(attempt.lesson_id) || ''
  }));
}

module.exports = { create, listForStudent, listForTeacher, listForTeacherStudent };
