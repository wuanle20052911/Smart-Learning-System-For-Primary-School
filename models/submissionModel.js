const { getSupabaseClient } = require('./supabaseClient');

async function getAttemptNumber(client, assignmentId, studentId) {
  const { count, error } = await client.from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId).eq('student_id', studentId);
  if (error) throw error;
  return (count || 0) + 1;
}

async function getStudentSubmission(client, assignmentId, studentId) {
  const { data, error } = await client.from('assignment_submissions')
    .select('id,assignment_id,student_id,answers,score,correct_count,total_questions,attempt_number,started_at,submitted_at')
    .eq('assignment_id', assignmentId).eq('student_id', studentId)
    .order('submitted_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function create(accessToken, studentId, assignmentId, answers, result) {
  const client = getSupabaseClient(accessToken);
  if (await getStudentSubmission(client, assignmentId, studentId)) {
    const error = new Error('Bài tập này đã được nộp, em có thể xem lại kết quả.');
    error.code = 'ALREADY_SUBMITTED';
    throw error;
  }
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

async function listForStudent(accessToken, studentId) {
  const client = getSupabaseClient(accessToken);
  const { data, error } = await client.from('assignment_submissions')
    .select('id,assignment_id,student_id,answers,score,correct_count,total_questions,attempt_number,started_at,submitted_at')
    .eq('student_id', studentId).order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function listForTeacher(accessToken, teacherId) {
  const client = getSupabaseClient(accessToken);
  const { data: assignments, error: assignmentError } = await client.from('assignments').select('id,title').eq('created_by', teacherId);
  if (assignmentError) throw assignmentError;
  const ids = assignments.map((assignment) => assignment.id);
  if (!ids.length) return [];
  const { data, error } = await client.from('assignment_submissions')
    .select('id,assignment_id,student_id,score,correct_count,total_questions,attempt_number,submitted_at')
    .in('assignment_id', ids).order('submitted_at', { ascending: false });
  if (error) throw error;
  const studentIds = [...new Set(data.map((submission) => submission.student_id))];
  const { data: students, error: studentError } = studentIds.length
    ? await client.from('users').select('id,full_name,email').in('id', studentIds)
    : { data: [], error: null };
  if (studentError) throw studentError;
  const submissionIds = data.map((submission) => submission.id);
  const { data: feedbackRows, error: feedbackError } = submissionIds.length
    ? await client.from('feedback').select('submission_id').in('submission_id', submissionIds)
    : { data: [], error: null };
  if (feedbackError) throw feedbackError;
  const feedbackCounts = new Map();
  feedbackRows.forEach((item) => feedbackCounts.set(item.submission_id, (feedbackCounts.get(item.submission_id) || 0) + 1));
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const studentMap = new Map(students.map((student) => [student.id, student]));
  return data.map((submission) => ({
    ...submission,
    assignment_title: assignmentMap.get(submission.assignment_id)?.title || 'Bài tập',
    student: studentMap.get(submission.student_id) || null,
    feedback_count: feedbackCounts.get(submission.id) || 0
  }));
}

async function getForTeacher(accessToken, teacherId, submissionId) {
  const client = getSupabaseClient(accessToken);
  const { data: submission, error } = await client.from('assignment_submissions')
    .select('id,assignment_id,student_id,answers,score,correct_count,total_questions,attempt_number,started_at,submitted_at')
    .eq('id', submissionId).single();
  if (error) throw error;
  const { data: assignment, error: assignmentError } = await client.from('assignments')
    .select('id,title,description,created_by').eq('id', submission.assignment_id).eq('created_by', teacherId).single();
  if (assignmentError) throw assignmentError;
  const { data: questions, error: questionError } = await client.from('assignment_questions')
    .select('id,position,type,question,options,answer,explanation,points')
    .eq('assignment_id', assignment.id).order('position');
  if (questionError) throw questionError;
  const { data: student, error: studentError } = await client.from('users')
    .select('id,full_name,email').eq('id', submission.student_id).single();
  if (studentError) throw studentError;
  const { data: feedback, error: feedbackError } = await client.from('feedback')
    .select('id,submission_id,teacher_id,comment,created_at').eq('submission_id', submissionId).order('created_at', { ascending: false });
  if (feedbackError) throw feedbackError;
  return { ...submission, assignment, student, questions, feedback };
}

async function addFeedback(accessToken, teacherId, submissionId, comment) {
  const client = getSupabaseClient(accessToken);
  const detail = await getForTeacher(accessToken, teacherId, submissionId);
  const { data, error } = await client.from('feedback')
    .insert({ submission_id: detail.id, teacher_id: teacherId, comment: comment.trim() })
    .select('id,submission_id,teacher_id,comment,created_at').single();
  if (error) throw error;
  return data;
}

module.exports = { create, listForStudent, listForTeacher, getForTeacher, addFeedback, getStudentSubmission };
