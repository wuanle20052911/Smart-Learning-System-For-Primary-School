const { getSupabaseAdminClient } = require('./supabaseAdminClient');
const { buildContacts, summarizeThreads, findContact, normalizeMessageBody } = require('../services/messaging');

const MESSAGE_FIELDS = 'id,student_id,parent_id,teacher_id,sender_id,body,created_at,read_at';
const THREAD_PAGE = 200;

async function fetchAll(buildQuery) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function fetchIn(ids, buildQuery, chunkSize = 200) {
  const rows = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    rows.push(...await fetchAll(() => buildQuery(ids.slice(index, index + chunkSize))));
  }
  return rows;
}

const unique = (values) => [...new Set(values.filter(Boolean))];

function forbidden(message = 'Bạn không có quyền nhắn tin trong cuộc trò chuyện này.') {
  const error = new Error(message);
  error.code = 'FORBIDDEN';
  return error;
}

async function loadContacts(client, viewer) {
  let links;
  if (viewer.role === 'parent') {
    links = await fetchAll(() => client.from('parent_student_links')
      .select('parent_id,student_id').eq('parent_id', viewer.id).order('student_id'));
  } else if (viewer.role === 'teacher') {
    const teacherClasses = await fetchAll(() => client.from('classes')
      .select('id').or(`created_by.eq.${viewer.id},assigned_teacher_id.eq.${viewer.id}`).order('id'));
    const classIds = teacherClasses.map((row) => row.id);
    if (!classIds.length) return [];
    const members = await fetchIn(classIds, (ids) => client.from('class_members')
      .select('student_id').in('class_id', ids).order('student_id'));
    const studentIds = unique(members.map((row) => row.student_id));
    if (!studentIds.length) return [];
    links = await fetchIn(studentIds, (ids) => client.from('parent_student_links')
      .select('parent_id,student_id').in('student_id', ids).order('student_id'));
  } else {
    throw forbidden('Tin nhắn chỉ dành cho phụ huynh và giáo viên.');
  }
  if (!links.length) return [];

  const studentIds = unique(links.map((link) => link.student_id));
  const memberships = await fetchIn(studentIds, (ids) => client.from('class_members')
    .select('student_id,class_id').in('student_id', ids).order('class_id'));
  const classIds = unique(memberships.map((row) => row.class_id));
  const classes = classIds.length
    ? await fetchIn(classIds, (ids) => client.from('classes')
      .select('id,name,created_by,assigned_teacher_id').in('id', ids).order('id'))
    : [];
  const userIds = unique([
    ...links.flatMap((link) => [link.parent_id, link.student_id]),
    ...classes.flatMap((row) => [row.created_by, row.assigned_teacher_id])
  ]);
  const users = await fetchIn(userIds, (ids) => client.from('users')
    .select('id,full_name,role').in('id', ids).order('id'));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return buildContacts({ links, memberships, classes, usersById })
    .filter((contact) => (viewer.role === 'parent' ? contact.parent.id : contact.teacher.id) === viewer.id);
}

async function listThreads(viewer) {
  const client = getSupabaseAdminClient();
  const contacts = await loadContacts(client, viewer);
  if (!contacts.length) return [];
  const column = viewer.role === 'parent' ? 'parent_id' : 'teacher_id';
  const { data: messages, error } = await client.from('parent_teacher_messages')
    .select(MESSAGE_FIELDS)
    .eq(column, viewer.id)
    .order('created_at', { ascending: false })
    .limit(3000);
  if (error) throw error;
  return summarizeThreads(contacts, messages || [], viewer.id);
}

async function countUnread(viewer) {
  if (!['parent', 'teacher'].includes(viewer.role)) return 0;
  const column = viewer.role === 'parent' ? 'parent_id' : 'teacher_id';
  const { count, error } = await getSupabaseAdminClient().from('parent_teacher_messages')
    .select('id', { count: 'exact', head: true })
    .eq(column, viewer.id)
    .neq('sender_id', viewer.id)
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

function threadQuery(client, contact) {
  return client.from('parent_teacher_messages')
    .select(MESSAGE_FIELDS)
    .eq('student_id', contact.student.id)
    .eq('parent_id', contact.parent.id)
    .eq('teacher_id', contact.teacher.id);
}

async function getThread(viewer, studentId, otherId) {
  const client = getSupabaseAdminClient();
  const contact = findContact(await loadContacts(client, viewer), viewer, studentId, otherId);
  if (!contact) throw forbidden();

  const { data, error } = await threadQuery(client, contact)
    .order('created_at', { ascending: false })
    .limit(THREAD_PAGE);
  if (error) throw error;
  const messages = (data || []).reverse();

  const unreadIds = messages.filter((message) => message.sender_id !== viewer.id && !message.read_at).map((message) => message.id);
  if (unreadIds.length) {
    const readAt = new Date().toISOString();
    const { error: readError } = await client.from('parent_teacher_messages')
      .update({ read_at: readAt }).in('id', unreadIds);
    if (readError) throw readError;
    messages.forEach((message) => { if (unreadIds.includes(message.id)) message.read_at = readAt; });
  }

  return {
    contact,
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      created_at: message.created_at,
      read_at: message.read_at,
      from_me: message.sender_id === viewer.id
    })),
    truncated: messages.length === THREAD_PAGE
  };
}

async function sendMessage(viewer, studentId, otherId, rawBody) {
  const body = normalizeMessageBody(rawBody);
  const client = getSupabaseAdminClient();
  const contact = findContact(await loadContacts(client, viewer), viewer, studentId, otherId);
  if (!contact) throw forbidden();
  const { data, error } = await client.from('parent_teacher_messages')
    .insert({
      student_id: contact.student.id,
      parent_id: contact.parent.id,
      teacher_id: contact.teacher.id,
      sender_id: viewer.id,
      body
    })
    .select(MESSAGE_FIELDS)
    .single();
  if (error) throw error;
  return { id: data.id, body: data.body, created_at: data.created_at, read_at: data.read_at, from_me: true };
}

module.exports = { listThreads, countUnread, getThread, sendMessage };
