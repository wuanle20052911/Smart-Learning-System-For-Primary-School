const { getSupabaseClient } = require('./supabaseClient');

const fields = 'id,question_id,question_key,created_by,lesson_id,skill_id,type,content,options,answer,explanation,points,created_at,updated_at';

function toQuestion(item) {
  return item ? { ...item, question: item.content } : item;
}

async function list(accessToken, teacherId) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('questions')
    .select(fields)
    .eq('created_by', teacherId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(toQuestion);
}

async function create(accessToken, teacherId, question) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('questions')
    .insert({ ...question, created_by: teacherId })
    .select(fields)
    .single();
  if (error) throw error;
  return toQuestion(data);
}

async function remove(accessToken, teacherId, id) {
  const { error } = await getSupabaseClient(accessToken)
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('created_by', teacherId);
  if (error) throw error;
}

module.exports = { list, create, remove };
