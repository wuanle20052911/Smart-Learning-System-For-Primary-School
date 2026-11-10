const { getSupabaseAdminClient } = require('./supabaseAdminClient');
const { buildChildInsights } = require('../services/parentInsights');

async function fetchAllPages(buildQuery) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function getDashboard(parentId) {
  const client = getSupabaseAdminClient();
  const { data: links, error: linkError } = await client
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', parentId);
  if (linkError) throw linkError;

  const studentIds = [...new Set((links || []).map((link) => link.student_id))];
  if (!studentIds.length) return { children: [] };

  const { data: students, error: studentError } = await client
    .from('users')
    .select('id,full_name')
    .in('id', studentIds)
    .eq('role', 'student')
    .order('full_name');
  if (studentError) throw studentError;
  const visibleStudentIds = students.map((student) => student.id);
  if (!visibleStudentIds.length) return { children: [] };

  const [memberships, attempts] = await Promise.all([
    fetchAllPages(() => client.from('class_members')
      .select('student_id,class_id')
      .in('student_id', visibleStudentIds)
      .order('student_id')
      .order('class_id')),
    fetchAllPages(() => client.from('quiz_attempts')
      .select('id,student_id,title,chapter,score,total,created_at')
      .in('student_id', visibleStudentIds)
      .order('created_at', { ascending: false })
      .order('id'))
  ]);

  const classIds = [...new Set(memberships.map((item) => item.class_id))];
  const [classes, assignments, submissions] = await Promise.all([
    classIds.length
      ? fetchAllPages(() => client.from('classes').select('id,name,grade').in('id', classIds).order('id'))
      : Promise.resolve([]),
    classIds.length
      ? fetchAllPages(() => client.from('assignments')
        .select('id,title,class_id,due_at,published')
        .in('class_id', classIds)
        .eq('published', true)
        .order('id'))
      : Promise.resolve([]),
    fetchAllPages(() => client.from('assignment_submissions')
      .select('id,assignment_id,student_id,score,submitted_at,attempt_number')
      .in('student_id', visibleStudentIds)
      .order('submitted_at', { ascending: false })
      .order('id'))
  ]);

  return {
    children: students.map((student) => {
      const studentClassIds = new Set(memberships
        .filter((membership) => membership.student_id === student.id)
        .map((membership) => membership.class_id));
      return buildChildInsights({
        student,
        classes: classes.filter((classItem) => studentClassIds.has(classItem.id)),
        assignments,
        submissions: submissions.filter((item) => item.student_id === student.id),
        attempts: attempts.filter((item) => item.student_id === student.id)
      });
    })
  };
}

async function listLinks() {
  const client = getSupabaseAdminClient();
  const { data: links, error } = await client
    .from('parent_student_links')
    .select('parent_id,student_id,linked_by,linked_at')
    .order('linked_at', { ascending: false });
  if (error) throw error;
  if (!links?.length) return [];

  const userIds = [...new Set(links.flatMap((link) => [link.parent_id, link.student_id]))];
  const { data: users, error: userError } = await client
    .from('users')
    .select('id,email,full_name,role')
    .in('id', userIds);
  if (userError) throw userError;
  const usersById = new Map((users || []).map((user) => [user.id, user]));

  return links.map((link) => ({
    ...link,
    parent: usersById.get(link.parent_id) || null,
    student: usersById.get(link.student_id) || null
  }));
}

async function createLink(adminId, parentId, studentId) {
  if (parentId === studentId) {
    const error = new Error('Tài khoản phụ huynh và học sinh phải khác nhau.');
    error.code = 'INVALID_LINK';
    throw error;
  }

  const client = getSupabaseAdminClient();
  const { data: users, error: userError } = await client
    .from('users')
    .select('id,role')
    .in('id', [parentId, studentId]);
  if (userError) throw userError;
  const rolesById = new Map((users || []).map((user) => [user.id, user.role]));
  if (rolesById.get(parentId) !== 'parent' || rolesById.get(studentId) !== 'student') {
    const error = new Error('Chỉ có thể liên kết đúng tài khoản phụ huynh với tài khoản học sinh.');
    error.code = 'INVALID_LINK';
    throw error;
  }

  const { data, error } = await client
    .from('parent_student_links')
    .insert({ parent_id: parentId, student_id: studentId, linked_by: adminId })
    .select('parent_id,student_id,linked_by,linked_at')
    .single();
  if (error) {
    if (error.code === '23505') {
      const duplicateError = new Error('Phụ huynh này đã được liên kết với học sinh.');
      duplicateError.code = 'LINK_EXISTS';
      throw duplicateError;
    }
    throw error;
  }
  return data;
}

async function removeLink(parentId, studentId) {
  const { data, error } = await getSupabaseAdminClient()
    .from('parent_student_links')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .select('parent_id,student_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFoundError = new Error('Không tìm thấy liên kết phụ huynh–học sinh.');
    notFoundError.code = 'LINK_NOT_FOUND';
    throw notFoundError;
  }
  return data;
}

async function getIncomingRequests(parentId) {
  const client = getSupabaseAdminClient();
  const { data: requests, error } = await client
    .from('parent_link_requests')
    .select('id,student_id,status,created_at')
    .eq('parent_id', parentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!requests?.length) return [];

  const studentIds = [...new Set(requests.map((request) => request.student_id))];
  const { data: students, error: studentError } = await client
    .from('users')
    .select('id,full_name')
    .in('id', studentIds)
    .eq('role', 'student');
  if (studentError) throw studentError;
  const studentsById = new Map((students || []).map((student) => [student.id, student]));
  return requests.map((request) => ({ ...request, student: studentsById.get(request.student_id) || null }));
}

async function getStudentRequests(studentId) {
  const { data, error } = await getSupabaseAdminClient()
    .from('parent_link_requests')
    .select('id,status,created_at,updated_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function createLinkRequest(studentId, phoneNumber) {
  const client = getSupabaseAdminClient();
  const { data: parent, error: parentError } = await client
    .from('users')
    .select('id')
    .eq('role', 'parent')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
  if (parentError) throw parentError;
  if (!parent) {
    const error = new Error('No parent account found for this phone number.');
    error.code = 'PARENT_NOT_FOUND';
    throw error;
  }

  const { data: link, error: linkError } = await client
    .from('parent_student_links')
    .select('parent_id')
    .eq('parent_id', parent.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (linkError) throw linkError;
  if (link) {
    const error = new Error('Tài khoản phụ huynh này đã được liên kết với bạn.');
    error.code = 'LINK_EXISTS';
    throw error;
  }

  const { data, error } = await client
    .from('parent_link_requests')
    .insert({ parent_id: parent.id, student_id: studentId })
    .select('id,status,created_at')
    .single();
  if (error?.code === '23505') {
    const duplicateError = new Error('Bạn đã gửi yêu cầu đang chờ phụ huynh xác nhận.');
    duplicateError.code = 'REQUEST_EXISTS';
    throw duplicateError;
  }
  if (error) throw error;
  return data;
}

async function respondToRequest(parentId, requestId, action) {
  const { data, error } = await getSupabaseAdminClient().rpc('respond_to_parent_link_request', {
    p_parent_id: parentId,
    p_request_id: requestId,
    p_action: action
  });
  if (error?.code === 'P0002') {
    const notFoundError = new Error('Request is no longer pending.');
    notFoundError.code = 'REQUEST_NOT_PENDING';
    throw notFoundError;
  }
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

module.exports = {
  getDashboard, listLinks, createLink, removeLink,
  getIncomingRequests, getStudentRequests, createLinkRequest, respondToRequest
};
