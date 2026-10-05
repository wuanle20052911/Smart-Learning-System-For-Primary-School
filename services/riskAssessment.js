const MIN_SCORE_ATTEMPTS = 3;
const MIN_OVERDUE_ASSIGNMENTS = 2;

function assessStudentRisk({ attempts, overdueAssignments, submittedOverdueAssignments }) {
  const scoreAttempts = attempts
    .filter((attempt) => Number.isFinite(Number(attempt.score)) && Number(attempt.total) > 0)
    .map((attempt) => ({
      score: Number(attempt.score),
      total: Number(attempt.total),
      percent: (Number(attempt.score) / Number(attempt.total)) * 100,
      createdAt: new Date(attempt.created_at).getTime()
    }))
    .sort((left, right) => right.createdAt - left.createdAt);
  const dueCount = overdueAssignments.length;
  const submittedCount = submittedOverdueAssignments.length;
  const missedCount = Math.max(0, dueCount - submittedCount);
  const hasScoreEvidence = scoreAttempts.length >= MIN_SCORE_ATTEMPTS;
  const hasCompletionEvidence = dueCount >= MIN_OVERDUE_ASSIGNMENTS;
  const reasons = [];
  let risk = 'Ổn định';

  if (hasScoreEvidence) {
    const averageScore = scoreAttempts.reduce((sum, attempt) => sum + attempt.percent, 0) / scoreAttempts.length;
    if (averageScore < 50) {
      risk = 'Cao';
      reasons.push(`Điểm trung bình thấp (${Math.round(averageScore)}% qua ${scoreAttempts.length} lượt làm bài).`);
    } else if (averageScore < 65) {
      risk = 'Theo dõi';
      reasons.push(`Điểm trung bình cần cải thiện (${Math.round(averageScore)}% qua ${scoreAttempts.length} lượt làm bài).`);
    }

    if (scoreAttempts.length >= 4) {
      const recent = scoreAttempts.slice(0, 2);
      const previous = scoreAttempts.slice(2, 4);
      const recentAverage = recent.reduce((sum, attempt) => sum + attempt.percent, 0) / recent.length;
      const previousAverage = previous.reduce((sum, attempt) => sum + attempt.percent, 0) / previous.length;
      const decline = previousAverage - recentAverage;
      if (decline >= 15) {
        risk = 'Cao';
        reasons.push(`Điểm giảm ${Math.round(decline)} điểm phần trăm qua các lượt gần đây.`);
      } else if (decline >= 10) {
        if (risk !== 'Cao') risk = 'Theo dõi';
        reasons.push(`Điểm có xu hướng giảm ${Math.round(decline)} điểm phần trăm.`);
      }
    }
  }

  if (hasCompletionEvidence && missedCount > 0) {
    if (missedCount >= 2 || missedCount / dueCount >= 0.6) {
      risk = 'Cao';
      reasons.push(`Chưa nộp ${missedCount}/${dueCount} bài đã quá hạn.`);
    } else {
      if (risk !== 'Cao') risk = 'Theo dõi';
      reasons.push(`Còn ${missedCount} bài đã quá hạn chưa nộp.`);
    }
  }

  const enoughData = hasScoreEvidence || hasCompletionEvidence;
  if (!enoughData) risk = 'Chưa đủ dữ liệu';

  const averageScore = scoreAttempts.length
    ? Math.round(scoreAttempts.reduce((sum, attempt) => sum + attempt.percent, 0) / scoreAttempts.length * 10) / 10
    : null;

  return {
    attempts: scoreAttempts.length,
    averageScore,
    overdueAssignments: dueCount,
    submittedOverdueAssignments: submittedCount,
    missedOverdueAssignments: missedCount,
    completionRate: dueCount ? Math.round(submittedCount / dueCount * 100) : null,
    enoughData,
    risk,
    reasons
  };
}

module.exports = { assessStudentRisk, MIN_SCORE_ATTEMPTS, MIN_OVERDUE_ASSIGNMENTS };
