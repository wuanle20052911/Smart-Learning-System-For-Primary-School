const { getSupabaseClient } = require('./supabaseClient');

const assignmentFields = 'id,title,description,subject_id,topic_id,skill_id,class_id,created_by,difficulty,question_count,due_at,published,created_at,updated_at';
const questionFields = 'id,assignment_id,skill_id,position,type,question,options,answer,explanation,points';

async function listForTeacher(accessToken, teacherId) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('assignments').select(assignmentFields).eq('created_by', teacherId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function listForStudent(accessToken) {
  const { data, error } = await getSupabaseClient(accessToken)
    .from('assignments').select(assignmentFields).eq('published', true).order('due_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

async function getWithQuestions(accessToken, id) {
  const client = getSupabaseClient(accessToken);
  const { data: assignment, error } = await client.from('assignments').select(assignmentFields).eq('id', id).single();
  if (error) throw error;
  const { data: questions, error: questionError } = await client.from('assignment_questions').select(questionFields).eq('assignment_id', id).order('position');
  if (questionError) throw questionError;
  return { ...assignment, questions };
}

async function create(accessToken, teacherId, assignment, questions) {
  const client = getSupabaseClient(accessToken);
  const { data, error } = await client.from('assignments')
    .insert({ ...assignment, created_by: teacherId, question_count: questions.length })
    .select(assignmentFields).single();
  if (error) throw error;
  const { error: questionError } = await client.from('assignment_questions')
    .insert(questions.map((question, index) => ({ ...question, assignment_id: data.id, position: index + 1 })));
  if (questionError) throw questionError;
  return getWithQuestions(accessToken, data.id);
}

module.exports = { listForTeacher, listForStudent, getWithQuestions, create };
