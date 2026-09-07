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
  const { data, error } = await client
    .from('classes')
    .select('id,name,grade,created_at,assigned_teacher_id')
    .or(`created_by.eq.${teacherId},assigned_teacher_id.eq.${teacherId}`)
    .order('name');
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

async function listTeachers(client) {
  const { data, error } = await client.rpc('manager_list_teachers');
  if (error) throw error;
  return data || [];
}

async function listManagedClasses(client) {
  const { data, error } = await client.rpc('manager_list_classes');
  if (error) throw error;
  return data || [];
}

async function managerCreateClass(client, name, grade, teacherId) {
  const { data, error } = await client.rpc('manager_create_class', {
    target_name: name,
    target_grade: grade,
    target_teacher_id: teacherId
  });
  if (error) throw error;
  return data;
}

async function managerAddClassMember(client, classId, email) {
  const { data, error } = await client.rpc('manager_add_student_to_class', {
    target_class_id: classId,
    target_email: email
  });
  if (error) throw error;
  return data;
}

module.exports = { getSupabaseClient, list, create, listClasses, addClassMember, listTeachers, listManagedClasses, managerCreateClass, managerAddClassMember };
