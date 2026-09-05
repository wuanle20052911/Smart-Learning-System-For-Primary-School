const { getSupabaseClient } = require('./supabaseClient');

const lessonFields = 'id,title,description,subject,grade,topic,icon,color,published,content,source_filename,created_by,created_at,updated_at';

async function listPublished(accessToken) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('lessons')
    .select(lessonFields)
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function listForTeacher(accessToken, userId) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('lessons')
    .select(lessonFields)
    .eq('created_by', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function create(accessToken, userId, lesson) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('lessons')
    .insert({ ...lesson, created_by: userId })
    .select(lessonFields)
    .single();
  if (error) throw error;
  return data;
}

async function update(accessToken, userId, id, lesson) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('lessons')
    .update(lesson)
    .eq('id', id)
    .eq('created_by', userId)
    .select(lessonFields)
    .single();
  if (error) throw error;
  return data;
}

async function remove(accessToken, userId, id) {
  const { error } = await getSupabaseClient(accessToken)
    .from('lessons')
    .delete()
    .eq('id', id)
    .eq('created_by', userId);
  if (error) throw error;
}

module.exports = { listPublished, listForTeacher, create, update, remove };
