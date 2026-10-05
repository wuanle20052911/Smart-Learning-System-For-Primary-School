const test = require('node:test');
const assert = require('node:assert/strict');
const { syncTeacherRiskAlerts } = require('../models/riskAlertModel');

function createMemoryClient() {
  const rows = [];
  let nextId = 1;

  class Query {
    constructor() {
      this.filters = [];
      this.action = 'select';
      this.payload = null;
      this.singleResult = false;
    }
    select() { return this; }
    eq(field, value) { this.filters.push((row) => row[field] === value); return this; }
    order(field, { ascending = true } = {}) {
      this.sort = (left, right) => (left[field] > right[field] ? 1 : left[field] < right[field] ? -1 : 0) * (ascending ? 1 : -1);
      return this;
    }
    limit(count) { this.maxRows = count; return this; }
    insert(payload) { this.action = 'insert'; this.payload = payload; return this; }
    update(payload) { this.action = 'update'; this.payload = payload; return this; }
    single() { this.singleResult = true; return this; }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    async execute() {
      let matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.action === 'insert') {
        if (rows.some((row) => row.teacher_id === this.payload.teacher_id && row.student_id === this.payload.student_id && row.status === 'active')) {
          return { data: null, error: { code: '23505' } };
        }
        const row = { id: `alert-${nextId++}`, status: 'active', first_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), ...this.payload };
        rows.push(row);
        return { data: null, error: null };
      }
      if (this.action === 'update') {
        matched.forEach((row) => Object.assign(row, this.payload));
      }
      if (this.sort) matched = [...matched].sort(this.sort);
      if (this.maxRows) matched = matched.slice(0, this.maxRows);
      return { data: this.singleResult ? matched[0] || null : matched, error: null };
    }
  }

  return { rows, from: () => new Query() };
}

const student = (risk, enoughData = true) => ({
  student_id: 'student-1',
  risk,
  enoughData,
  averageScore: 42,
  accuracyRate: 42,
  attempts: 3,
  overdueAssignments: 0,
  missedOverdueAssignments: 0,
  reasons: ['Điểm trung bình thấp.']
});

test('persists one open alert, updates it, and keeps resolved alert history', async () => {
  const client = createMemoryClient();

  const first = await syncTeacherRiskAlerts(client, 'teacher-1', [student('Cao')]);
  assert.equal(first.activeAlerts.length, 1);
  const firstAlertId = first.activeAlerts[0].id;

  const refreshed = await syncTeacherRiskAlerts(client, 'teacher-1', [student('Cao')]);
  assert.equal(refreshed.activeAlerts.length, 1);
  assert.equal(refreshed.activeAlerts[0].id, firstAlertId);
  assert.equal(client.rows.length, 1);

  const resolved = await syncTeacherRiskAlerts(client, 'teacher-1', [student('Ổn định')]);
  assert.equal(resolved.activeAlerts.length, 0);
  assert.equal(resolved.recentResolvedAlerts.length, 1);

  const reopened = await syncTeacherRiskAlerts(client, 'teacher-1', [student('Cao')]);
  assert.equal(reopened.activeAlerts.length, 1);
  assert.notEqual(reopened.activeAlerts[0].id, firstAlertId);
  assert.equal(client.rows.length, 2);
});

test('does not close an existing alert when there is insufficient new evidence', async () => {
  const client = createMemoryClient();
  await syncTeacherRiskAlerts(client, 'teacher-1', [student('Cao')]);

  const result = await syncTeacherRiskAlerts(client, 'teacher-1', [student('Chưa đủ dữ liệu', false)]);

  assert.equal(result.activeAlerts.length, 1);
  assert.equal(result.activeAlerts[0].status, 'active');
});
