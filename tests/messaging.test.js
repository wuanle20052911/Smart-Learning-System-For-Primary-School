const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContacts, summarizeThreads, findContact, normalizeMessageBody } = require('../services/messaging');

const users = [
  { id: 'p1', full_name: 'Chị Lan', role: 'parent' },
  { id: 'p2', full_name: 'Anh Minh', role: 'parent' },
  { id: 's1', full_name: 'Nguyễn An', role: 'student' },
  { id: 's2', full_name: 'Trần Bình', role: 'student' },
  { id: 't1', full_name: 'Hoa', role: 'teacher' },
  { id: 't2', full_name: 'Tuấn', role: 'teacher' },
  { id: 'a1', full_name: 'Quản trị', role: 'admin' }
];
const usersById = new Map(users.map((user) => [user.id, user]));

function contactsFor(overrides = {}) {
  return buildContacts({
    links: [{ parent_id: 'p1', student_id: 's1' }, { parent_id: 'p2', student_id: 's2' }],
    memberships: [
      { student_id: 's1', class_id: 'c1' },
      { student_id: 's1', class_id: 'c2' },
      { student_id: 's2', class_id: 'c2' }
    ],
    classes: [
      { id: 'c1', name: 'Lớp 3A', created_by: 'a1', assigned_teacher_id: 't1' },
      { id: 'c2', name: 'Lớp 3B', created_by: 't2', assigned_teacher_id: null }
    ],
    usersById,
    ...overrides
  });
}

test('contacts pair each linked parent with every teacher of the child', () => {
  const contacts = contactsFor();
  const pairs = contacts.map((contact) => `${contact.parent.id}-${contact.student.id}-${contact.teacher.id}`).sort();
  assert.deepEqual(pairs, ['p1-s1-t1', 'p1-s1-t2', 'p2-s2-t2']);
});

test('class creators who are admins are not treated as teachers', () => {
  const contacts = contactsFor();
  assert.ok(contacts.every((contact) => contact.teacher.id !== 'a1'));
});

test('a teacher who teaches the child in two classes gets one thread listing both classes', () => {
  const contacts = buildContacts({
    links: [{ parent_id: 'p1', student_id: 's1' }],
    memberships: [{ student_id: 's1', class_id: 'c1' }, { student_id: 's1', class_id: 'c3' }],
    classes: [
      { id: 'c1', name: 'Lớp 3A', created_by: 't1', assigned_teacher_id: null },
      { id: 'c3', name: 'CLB Toán', created_by: 't1', assigned_teacher_id: 't1' }
    ],
    usersById
  });
  assert.equal(contacts.length, 1);
  assert.deepEqual(contacts[0].classes, ['Lớp 3A', 'CLB Toán']);
});

test('findContact only allows the exact parent–teacher pair for that child', () => {
  const contacts = contactsFor();
  assert.ok(findContact(contacts, { id: 'p1', role: 'parent' }, 's1', 't1'));
  assert.equal(findContact(contacts, { id: 'p1', role: 'parent' }, 's2', 't2'), null, 'not linked to s2');
  assert.equal(findContact(contacts, { id: 'p2', role: 'parent' }, 's2', 't1'), null, 't1 does not teach s2');
  assert.ok(findContact(contacts, { id: 't2', role: 'teacher' }, 's2', 'p2'));
  assert.equal(findContact(contacts, { id: 't1', role: 'teacher' }, 's2', 'p2'), null);
  assert.equal(findContact(contacts, { id: 't1', role: 'teacher' }, 's1', 'p2'), null, 'p2 is not the parent of s1');
});

test('summarizeThreads counts unread incoming messages and sorts by latest activity', () => {
  const contacts = contactsFor().filter((contact) => contact.parent.id === 'p1');
  const messages = [
    { student_id: 's1', parent_id: 'p1', teacher_id: 't1', sender_id: 't1', body: 'Chào chị', created_at: '2026-11-20T08:00:00Z', read_at: null },
    { student_id: 's1', parent_id: 'p1', teacher_id: 't1', sender_id: 't1', body: 'Con học tốt', created_at: '2026-11-20T09:00:00Z', read_at: null },
    { student_id: 's1', parent_id: 'p1', teacher_id: 't1', sender_id: 'p1', body: 'Cảm ơn cô', created_at: '2026-11-20T07:00:00Z', read_at: null },
    { student_id: 's1', parent_id: 'p1', teacher_id: 't2', sender_id: 't2', body: 'Đã đọc', created_at: '2026-11-19T07:00:00Z', read_at: '2026-11-19T08:00:00Z' }
  ];
  const threads = summarizeThreads(contacts, messages, 'p1');
  assert.equal(threads[0].teacher.id, 't1');
  assert.equal(threads[0].unread, 2);
  assert.equal(threads[0].last_message.body, 'Con học tốt');
  assert.equal(threads[0].last_message.from_me, false);
  assert.equal(threads[1].unread, 0);
});

test('message bodies are trimmed and limited to 2000 characters', () => {
  assert.equal(normalizeMessageBody('  Xin chào cô\r\n  '), 'Xin chào cô');
  assert.throws(() => normalizeMessageBody('   '), /không được để trống/);
  assert.throws(() => normalizeMessageBody(42), /không được để trống/);
  assert.throws(() => normalizeMessageBody('a'.repeat(2001)), /2000/);
  assert.equal(normalizeMessageBody('a'.repeat(2000)).length, 2000);
});
