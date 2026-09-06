const { getSupabaseClient } = require('./supabaseClient');

async function list(client, table, fields = '*') {
  const { data, error } = await client.from(table).select(fields).order('name');
  if (error) throw error;
  return data;
}

async function create(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function listClasses(client, teacherId) {
  const { data, error } = await client.from('classes').select('id,name,grade,created_at').eq('created_by', teacherId).order('name');
  if (error) throw error;
  return data;
}

async function addClassMember(client, classId, email) {
  const { data, error } = await client.rpc('add_student_to_class', {
    target_class_id: classId,
    target_email: email
  });
  if (error) throw error;
  return data;
}

module.exports = { getSupabaseClient, list, create, listClasses, addClassMember };
