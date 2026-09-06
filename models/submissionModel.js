const { getSupabaseClient } = require('./supabaseClient');

async function getAttemptNumber(client, assignmentId, studentId) {
  const { count, error } = await client.from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId).eq('student_id', studentId);
  if (error) throw error;
  return (count || 0) + 1;
}

async function create(accessToken, studentId, assignmentId, answers, result) {
  const client = getSupabaseClient(accessToken);
  const attemptNumber = await getAttemptNumber(client, assignmentId, studentId);
  const { data, error } = await client.from('assignment_submissions').insert({
    assignment_id: assignmentId,
    student_id: studentId,
    answers,
    ...result,
    attempt_number: attemptNumber
  }).select('id,assignment_id,student_id,score,correct_count,total_questions,attempt_number,started_at,submitted_at').single();
  if (error) throw error;
  return data;
}

async function listForTeacher(accessToken, teacherId) {
  const client = getSupabaseClient(accessToken);
  const { data: assignments, error: assignmentError } = await client.from('assignments').select('id').eq('created_by', teacherId);
  if (assignmentError) throw assignmentError;
  const ids = assignments.map((assignment) => assignment.id);
  if (!ids.length) return [];
  const { data, error } = await client.from('assignment_submissions')
    .select('id,assignment_id,student_id,score,correct_count,total_questions,attempt_number,submitted_at')
    .in('assignment_id', ids).order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { create, listForTeacher };
