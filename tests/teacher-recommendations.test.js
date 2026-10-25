const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTeacherLearningSummary,
  selectRecommendationModel,
  validateTeacherRecommendations
} = require('../services/teacherRecommendations');

test('prefers an installed chat model over the quiz reasoning model', () => {
  assert.equal(
    selectRecommendationModel(['deepseek-r1:8b', 'llama3.2:3b', 'nomic-embed-text:latest'], undefined, 'deepseek-r1:8b'),
    'llama3.2:3b'
  );
  assert.equal(
    selectRecommendationModel(['qwen2.5:7b', 'deepseek-r1:8b'], 'qwen2.5:7b', 'deepseek-r1:8b'),
    'qwen2.5:7b'
  );
  assert.equal(selectRecommendationModel(['nomic-embed-text:latest'], undefined, undefined), null);
});

test('builds recommendation evidence from quiz attempts, assignments, and real submissions', () => {
  const summary = buildTeacherLearningSummary({
    attempts: [{
      chapter: 'Ôn tập Phân số',
      title: 'Ôn tập',
      score: 3,
      total: 10,
      student_name: 'Private Learner',
      student_email: 'private.student@example.com'
    }],
    assignments: [
      { id: 'a1', title: 'Bài phân số', topic_id: 't1', class_id: 'c1', published: true },
      { id: 'a2', title: 'Bản nháp', topic_id: 't1', class_id: 'c1', published: false }
    ],
    submissions: [
      {
        assignment_id: 'a1',
        student_id: 's1',
        student_name: 'Private Learner',
        student_email: 'private.student@example.com',
        correct_count: 4,
        total_questions: 10
      },
      { assignment_id: 'a2', student_id: 's2', correct_count: 8, total_questions: 10 }
    ],
    topics: [{ id: 't1', name: 'Phân số' }],
    classes: [{ id: 'c1' }],
    classRosters: { c1: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] }
  });

  assert.equal(summary.quizAttemptCount, 1);
  assert.equal(summary.submissionCount, 2);
  assert.deepEqual(summary.completion, { submitted: 1, expected: 3, rate: 33 });
  assert.deepEqual(summary.topicMetrics[0], {
    topic: 'Phân số',
    attempts: 2,
    accuracy: 35,
    answeredQuestions: 20
  });
  assert.deepEqual(summary.recommendationSignals.map((signal) => [signal.topic, signal.kind]), [
    ['Phân số', 'accuracy'],
    ['Tỷ lệ nộp bài', 'completion']
  ]);
  assert.equal(JSON.stringify(summary).includes('s1'), false);
  assert.equal(JSON.stringify(summary).includes('private.student@example.com'), false);
  assert.equal(JSON.stringify(summary).includes('Private Learner'), false);
});

test('accepts only structured recommendations grounded in allowed topics', () => {
  const signals = [
    { topic: 'Phân số', kind: 'accuracy', accuracy: 35, attempts: 2, answeredQuestions: 20 },
    { topic: 'Tỷ lệ nộp bài', kind: 'completion', accuracy: 33, submitted: 1, expected: 3, attempts: 3 }
  ];
  const result = validateTeacherRecommendations({
    recommendations: [{
      topic: 'Phân số',
      activity: 'guided_review'
    }, {
      topic: 'Tỷ lệ nộp bài',
      activity: 'follow_up_submissions'
    }]
  }, signals);

  assert.equal(result[0].topic, 'Phân số');
  assert.equal(result[0].priority, 'high');
  assert.match(result[0].reason, /35% qua 2 lượt/);
  assert.equal(result[1].reason, 'Đã nộp 1/3 lượt bài tập được giao (33%).');
  assert.throws(() => validateTeacherRecommendations({
    recommendations: [{
      topic: 'Hình học',
      activity: 'guided_review'
    }]
  }, signals));
  assert.throws(() => validateTeacherRecommendations({
    recommendations: [{
      topic: 'Phân số',
      activity: 'follow_up_submissions'
    }]
  }, signals));
});

test('does not flag a 100 percent submission rate as an AI recommendation signal', () => {
  const summary = buildTeacherLearningSummary({
    attempts: [{ chapter: 'Chương 1', score: 5, total: 5 }],
    assignments: [{ id: 'a1', topic_id: 't1', class_id: 'c1', published: true }],
    submissions: [{ assignment_id: 'a1', student_id: 's1', correct_count: 5, total_questions: 5 }],
    topics: [{ id: 't1', name: 'Chương 1' }],
    classes: [{ id: 'c1' }],
    classRosters: { c1: [{ id: 's1' }] }
  });

  assert.deepEqual(summary.completion, { submitted: 1, expected: 1, rate: 100 });
  assert.deepEqual(summary.recommendationSignals, []);
});
