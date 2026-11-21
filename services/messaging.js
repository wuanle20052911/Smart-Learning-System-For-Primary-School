const MAX_MESSAGE_LENGTH = 2000;

function normalizeMessageBody(value) {
  const body = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  if (!body) {
    const error = new Error('Tin nhắn không được để trống.');
    error.code = 'INVALID_MESSAGE';
    throw error;
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`);
    error.code = 'INVALID_MESSAGE';
    throw error;
  }
  return body;
}

// Giáo viên của một lớp: người được phân công, hoặc người tạo lớp nếu đó là giáo viên.
function classTeacherIds(classRow, teacherIds) {
  return [classRow.assigned_teacher_id, classRow.created_by]
    .filter((id, index, list) => id && teacherIds.has(id) && list.indexOf(id) === index);
}

const threadKey = (studentId, parentId, teacherId) => `${studentId}:${parentId}:${teacherId}`;

/**
 * Danh sách người được nhắn tin, mỗi mục là một bộ (học sinh, phụ huynh, giáo viên).
 * links: parent_student_links; memberships: class_members; classes: classes;
 * users: map id -> { id, full_name, role }.
 */
function buildContacts({ links, memberships, classes, usersById }) {
  const teacherIds = new Set([...usersById.values()].filter((user) => user.role === 'teacher').map((user) => user.id));
  const classesById = new Map(classes.map((row) => [row.id, row]));
  const contacts = new Map();
  links.forEach((link) => {
    const student = usersById.get(link.student_id);
    const parent = usersById.get(link.parent_id);
    if (!student || student.role !== 'student' || !parent || parent.role !== 'parent') return;
    memberships
      .filter((membership) => membership.student_id === link.student_id)
      .forEach((membership) => {
        const classRow = classesById.get(membership.class_id);
        if (!classRow) return;
        classTeacherIds(classRow, teacherIds).forEach((teacherId) => {
          const key = threadKey(student.id, parent.id, teacherId);
          const teacher = usersById.get(teacherId);
          const existing = contacts.get(key);
          if (existing) {
            if (!existing.classes.includes(classRow.name)) existing.classes.push(classRow.name);
            return;
          }
          contacts.set(key, {
            key,
            student: { id: student.id, full_name: student.full_name || 'Học sinh' },
            parent: { id: parent.id, full_name: parent.full_name || 'Phụ huynh' },
            teacher: { id: teacher.id, full_name: teacher.full_name || 'Giáo viên' },
            classes: [classRow.name]
          });
        });
      });
  });
  return [...contacts.values()];
}

/** Gắn tin nhắn cuối và số tin chưa đọc vào từng cuộc trò chuyện của người dùng. */
function summarizeThreads(contacts, messages, viewerId) {
  const stats = new Map();
  messages.forEach((message) => {
    const key = threadKey(message.student_id, message.parent_id, message.teacher_id);
    const entry = stats.get(key) || { last: null, unread: 0 };
    if (!entry.last || new Date(message.created_at) > new Date(entry.last.created_at)) entry.last = message;
    if (message.sender_id !== viewerId && !message.read_at) entry.unread += 1;
    stats.set(key, entry);
  });
  return contacts
    .map((contact) => {
      const entry = stats.get(contact.key);
      return {
        ...contact,
        unread: entry?.unread || 0,
        last_message: entry?.last
          ? { body: entry.last.body.slice(0, 140), created_at: entry.last.created_at, from_me: entry.last.sender_id === viewerId }
          : null
      };
    })
    .sort((left, right) => {
      const leftTime = left.last_message ? new Date(left.last_message.created_at).getTime() : 0;
      const rightTime = right.last_message ? new Date(right.last_message.created_at).getTime() : 0;
      return rightTime - leftTime
        || left.student.full_name.localeCompare(right.student.full_name, 'vi')
        || left.teacher.full_name.localeCompare(right.teacher.full_name, 'vi');
    });
}

/** Tìm cuộc trò chuyện mà người xem được phép tham gia; null nếu không có quan hệ hợp lệ. */
function findContact(contacts, viewer, studentId, otherId) {
  return contacts.find((contact) => contact.student.id === studentId && (
    viewer.role === 'parent'
      ? contact.parent.id === viewer.id && contact.teacher.id === otherId
      : contact.teacher.id === viewer.id && contact.parent.id === otherId
  )) || null;
}

module.exports = { MAX_MESSAGE_LENGTH, normalizeMessageBody, buildContacts, summarizeThreads, findContact, threadKey };
