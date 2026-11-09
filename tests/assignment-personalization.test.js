const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../controllers/assignmentController');

const question = {
  type: 'multiple-choice',
  question: 'Phân số nào bé hơn 1?',
  options: ['5/3', '3/5', '7/4', '9/2'],
  answer: 1
};

test('normalizes an assignment targeted to one student with a learning goal', () => {
  const payload = normalize({
    title: 'Ôn tập cá nhân',
    class_id: 'class-1',
    target_student_id: 'student-1',
    learning_goal: '  Cộng phân số khác mẫu số  ',
    questions: [question]
  });

  assert.equal(payload.assignment.target_student_id, 'student-1');
  assert.equal(payload.assignment.learning_goal, 'Cộng phân số khác mẫu số');
});

test('rejects personalized assignments without a class or learning goal', () => {
  assert.throws(() => normalize({
    title: 'Ôn tập cá nhân',
    target_student_id: 'student-1',
    questions: [question]
  }), /lớp học và mục tiêu học tập/);
  assert.throws(() => normalize({
    title: 'Ôn tập cá nhân',
    class_id: 'class-1',
    target_student_id: 'student-1',
    questions: [question]
  }), /lớp học và mục tiêu học tập/);
});
