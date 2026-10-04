const alertFields = 'id,teacher_id,student_id,risk_level,risk_score,reason,indicators,status,first_seen_at,last_seen_at,resolved_at,created_at';

function alertPayload(student) {
  return {
    risk_level: student.risk,
    risk_score: student.averageScore,
    reason: student.reasons.join(' '),
    indicators: {
      attempts: student.attempts,
      averageScore: student.averageScore,
      accuracyRate: student.accuracyRate,
      overdueAssignments: student.overdueAssignments,
      missedOverdueAssignments: student.missedOverdueAssignments
    },
    last_seen_at: new Date().toISOString()
  };
}

async function updateActiveAlert(client, alert, payload) {
  const { data, error } = await client.from('risk_alerts')
    .update(payload)
    .eq('id', alert.id)
    .eq('status', 'active')
    .select(alertFields)
    .single();
  if (error) throw error;
  return data;
}

async function syncTeacherRiskAlerts(client, teacherId, students) {
  const { data: existing, error: listError } = await client.from('risk_alerts')
    .select(alertFields)
    .eq('teacher_id', teacherId)
    .eq('status', 'active');
  if (listError) throw listError;

  const activeByStudent = new Map((existing || []).map((alert) => [alert.student_id, alert]));
  const now = new Date().toISOString();

  for (const student of students) {
    if (!student.enoughData) continue;
    const activeAlert = activeByStudent.get(student.student_id);
    const isAtRisk = student.risk === 'Cao' || student.risk === 'Theo dõi';

    if (isAtRisk) {
      const payload = alertPayload(student);
      if (activeAlert) {
        await updateActiveAlert(client, activeAlert, payload);
      } else {
        const { error } = await client.from('risk_alerts').insert({
          teacher_id: teacherId,
          student_id: student.student_id,
          ...payload
        });
        if (error && error.code !== '23505') throw error;
        if (error?.code === '23505') {
          const { data: concurrentAlert, error: concurrentError } = await client.from('risk_alerts')
            .select(alertFields)
            .eq('teacher_id', teacherId)
            .eq('student_id', student.student_id)
            .eq('status', 'active')
            .single();
          if (concurrentError) throw concurrentError;
          await updateActiveAlert(client, concurrentAlert, payload);
        }
      }
    } else if (activeAlert) {
      const { error } = await client.from('risk_alerts')
        .update({ status: 'resolved', resolved_at: now, last_seen_at: now })
        .eq('id', activeAlert.id)
        .eq('status', 'active');
      if (error) throw error;
    }
  }

  const { data: activeAlerts, error: activeError } = await client.from('risk_alerts')
    .select(alertFields)
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
    .order('last_seen_at', { ascending: false });
  if (activeError) throw activeError;

  const { data: recentResolvedAlerts, error: historyError } = await client.from('risk_alerts')
    .select(alertFields)
    .eq('teacher_id', teacherId)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(20);
  if (historyError) throw historyError;

  return { activeAlerts: activeAlerts || [], recentResolvedAlerts: recentResolvedAlerts || [] };
}

module.exports = { syncTeacherRiskAlerts };
