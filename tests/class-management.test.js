const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLocalSchoolClass,
  addLocalStudentToClass,
  listLocalClasses,
  listLocalClassStudents,
  removeLocalClassMember,
  resetLocalClassStore
} = require('../models/catalogModel');

test('createLocalSchoolClass stores class metadata and assigned teacher', () => {
  resetLocalClassStore();

  const created = createLocalSchoolClass('Lớp 3A', 'Khối 3', 'teacher-001');

  assert.equal(created.name, 'Lớp 3A');
  assert.equal(created.grade, 'Khối 3');
  assert.equal(created.assigned_teacher_id, 'teacher-001');
  assert.equal(listLocalClasses('teacher-001').length, 1);
});

test('addLocalStudentToClass adds a student and lists them by class', () => {
  resetLocalClassStore();

  const classItem = createLocalSchoolClass('Lớp 2B', 'Khối 2', 'teacher-002');
  addLocalStudentToClass(classItem.id, 'student@example.com');

  const students = listLocalClassStudents(classItem.id);
  assert.equal(students.length, 1);
  assert.equal(students[0].email, 'student@example.com');
  assert.equal(students[0].full_name, 'student@example.com');
});

test('removeLocalClassMember removes a student from one class without deleting the class', () => {
  resetLocalClassStore();

  const classItem = createLocalSchoolClass('Lớp 2B', 'Khối 2', 'teacher-002');
  const student = addLocalStudentToClass(classItem.id, 'student@example.com');

  const removedStudent = removeLocalClassMember(classItem.id, student.id);

  assert.equal(removedStudent.id, student.id);
  assert.equal(listLocalClassStudents(classItem.id).length, 0);
  assert.equal(listLocalClasses('teacher-002').length, 1);
});
