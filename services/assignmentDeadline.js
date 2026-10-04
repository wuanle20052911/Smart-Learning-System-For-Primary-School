function normalizeDueAt(value, published = false, now = Date.now()) {
  if (value === undefined || value === null || value === '') return null;
  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) throw new Error('Hạn nộp không hợp lệ.');
  if (published && dueAt.getTime() <= now) throw new Error('Hạn nộp phải ở thời điểm trong tương lai.');
  return dueAt.toISOString();
}

function isAssignmentClosed(assignment, now = Date.now()) {
  return Boolean(assignment?.due_at && new Date(assignment.due_at).getTime() <= now);
}

module.exports = { normalizeDueAt, isAssignmentClosed };
