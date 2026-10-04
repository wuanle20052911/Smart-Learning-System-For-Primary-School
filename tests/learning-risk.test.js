const test = require('node:test');
const assert = require('node:assert/strict');
const { assessStudentRisk } = require('../services/riskAssessment');

function attemptsFromScores(scores) {
  return scores.map((score, index) => ({
    score,
    total: 10,
    created_at: new Date(Date.UTC(2026, 0, 10 - index)).toISOString()
  }));
}

test('does not assign a risk level when there is not enough evidence', () => {
  const result = assessStudentRisk({
    attempts: attemptsFromScores([2, 3]),
    overdueAssignments: [],
    submittedOverdueAssignments: []
  });

  assert.equal(result.risk, 'Chưa đủ dữ liệu');
  assert.equal(result.enoughData, false);
  assert.deepEqual(result.reasons, []);
});

test('raises a high-risk alert with a reason for repeated low scores', () => {
  const result = assessStudentRisk({
    attempts: attemptsFromScores([4, 3, 4]),
    overdueAssignments: [],
    submittedOverdueAssignments: []
  });

  assert.equal(result.risk, 'Cao');
  assert.match(result.reasons[0], /Điểm trung bình thấp/);
});

test('raises a risk alert for multiple overdue assignments not submitted', () => {
  const result = assessStudentRisk({
    attempts: [],
    overdueAssignments: [{ id: 'a1' }, { id: 'a2' }],
    submittedOverdueAssignments: []
  });

  assert.equal(result.risk, 'Cao');
  assert.equal(result.completionRate, 0);
  assert.match(result.reasons[0], /Chưa nộp 2\/2 bài đã quá hạn/);
});

test('detects a declining score trend and reports its reason', () => {
  const result = assessStudentRisk({
    attempts: attemptsFromScores([3, 3, 8, 8]),
    overdueAssignments: [],
    submittedOverdueAssignments: []
  });

  assert.equal(result.risk, 'Cao');
  assert.ok(result.reasons.some((reason) => /Điểm giảm/.test(reason)));
});

test('marks students with adequate results and no missed assignments stable', () => {
  const result = assessStudentRisk({
    attempts: attemptsFromScores([8, 7, 8]),
    overdueAssignments: [{ id: 'a1' }, { id: 'a2' }],
    submittedOverdueAssignments: [{ id: 'a1' }, { id: 'a2' }]
  });

  assert.equal(result.risk, 'Ổn định');
  assert.equal(result.completionRate, 100);
});
