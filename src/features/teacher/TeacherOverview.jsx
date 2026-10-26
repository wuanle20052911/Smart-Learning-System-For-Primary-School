export default function TeacherOverview({ data, loading, error, onRetry, onOpenAssignments, onOpenStudents }) {
  if (loading) return <section className="teacher-placeholder teacher-card"><span>◷</span><h2>Đang tải tổng quan lớp...</h2><p>Dữ liệu được lấy từ bài làm, bài tập và danh sách lớp đã lưu.</p></section>;
  if (error) return <section className="teacher-placeholder teacher-card"><span>!</span><h2>Không thể tải tổng quan</h2><p>{error}</p><button className="teacher-create" type="button" onClick={onRetry}>Thử lại</button></section>;
  if (!data) return <section className="teacher-placeholder teacher-card"><span>▥</span><h2>Chưa có dữ liệu tổng quan</h2><button className="teacher-create" type="button" onClick={onRetry}>Tải lại</button></section>;

  const { analytics, assignments: allAssignments, submissions, classRosters } = data;
  const overview = analytics.overview;
  const attempts = analytics.recentAttempts || [];
  const assignedWork = allAssignments.filter((assignment) => assignment.published && assignment.class_id);
  const expectedCount = assignedWork.reduce((total, assignment) => total + (classRosters[assignment.class_id]?.length || 0), 0);
  const submittedCount = assignedWork.reduce((total, assignment) => {
    const rosterIds = new Set((classRosters[assignment.class_id] || []).map((student) => student.id || student.student_id));
    const submittedIds = new Set(submissions
      .filter((submission) => submission.assignment_id === assignment.id && rosterIds.has(submission.student_id))
      .map((submission) => submission.student_id));
    return total + submittedIds.size;
  }, 0);
  const completionRate = expectedCount ? Math.round(submittedCount / expectedCount * 100) : null;
  const attemptAccuracy = overview.accuracyRate;
  const topicResults = new Map();
  attempts.forEach((attempt) => {
    const topic = attempt.chapter?.trim() || attempt.title?.trim() || 'Chưa phân chủ đề';
    const current = topicResults.get(topic) || { correct: 0, total: 0 };
    current.correct += Number(attempt.score) || 0;
    current.total += Number(attempt.total) || 0;
    topicResults.set(topic, current);
  });
  const topics = [...topicResults.entries()]
    .map(([name, result]) => ({ name, accuracy: result.total ? Math.round(result.correct / result.total * 100) : 0 }))
    .sort((left, right) => left.accuracy - right.accuracy)
    .slice(0, 6);
  const topicColor = (accuracy) => accuracy < 50 ? 'red' : accuracy < 70 ? 'yellow' : accuracy < 85 ? 'blue' : 'green';
  const weeklyResults = new Map();
  attempts.forEach((attempt) => {
    const date = new Date(attempt.created_at);
    if (Number.isNaN(date.getTime())) return;
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const key = weekStart.toISOString().slice(0, 10);
    const current = weeklyResults.get(key) || { score: 0, count: 0, date: weekStart };
    current.score += Number(attempt.total) ? Number(attempt.score) / Number(attempt.total) * 10 : 0;
    current.count += 1;
    weeklyResults.set(key, current);
  });
  const weekly = [...weeklyResults.values()].sort((left, right) => left.date - right.date).slice(-5);
  const chartPoints = weekly.map((item, index) => ({
    x: weekly.length === 1 ? 250 : 30 + index * (435 / (weekly.length - 1)),
    y: 140 - (item.score / item.count / 10) * 100,
    score: item.score / item.count,
    label: item.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }));
  const linePath = chartPoints.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
  const areaPath = chartPoints.length ? `${linePath} L${chartPoints[chartPoints.length - 1].x} 150 L${chartPoints[0].x} 150 Z` : '';
  const flaggedStudents = analytics.students
    .filter((student) => ['Cao', 'Theo dõi'].includes(student.risk))
    .slice(0, 4);
  const latestAssignments = [...assignedWork].sort((left, right) => new Date(right.updated_at || right.created_at) - new Date(left.updated_at || left.created_at)).slice(0, 4);

  return <>
    <section className="teacher-metrics">
      <article><span className="metric-icon blue">★</span><div><small>Điểm trung bình lượt làm</small><strong>{overview.attemptCount ? `${(overview.averageScore / 10).toFixed(1)}/10` : '—'}</strong><em>{overview.attemptCount} lượt làm bài</em></div></article>
      <article><span className="metric-icon green">✓</span><div><small>Tỷ lệ hoàn thành bài tập</small><strong>{completionRate === null ? '—' : `${completionRate}%`}</strong><em>{expectedCount ? `${submittedCount}/${expectedCount} lượt nộp dự kiến` : 'Chưa có bài tập được giao'}</em></div></article>
      <article><span className="metric-icon yellow">◎</span><div><small>Độ chính xác</small><strong>{overview.attemptCount ? `${attemptAccuracy}%` : '—'}</strong><em>{overview.attemptCount ? 'Tính từ câu trả lời đã lưu' : 'Chưa có lượt làm bài'}</em></div></article>
      <article><span className="metric-icon red">♟</span><div><small>Học sinh cần hỗ trợ</small><strong>{overview.supportCount}</strong><em>{overview.insufficientDataCount} học sinh chưa đủ dữ liệu</em></div></article>
    </section>
    <section className="teacher-chart-grid">
      <article className="teacher-card trend-card"><div className="card-heading"><div><small>ĐIỂM TRUNG BÌNH THEO TUẦN</small><h2>Tiến bộ của lớp</h2></div><span>{chartPoints.length ? `${chartPoints[chartPoints.length - 1].score.toFixed(1)}/10` : '—'}</span></div>
        {chartPoints.length ? <div className="line-chart"><svg viewBox="0 0 500 170" role="img" aria-label="Điểm trung bình các lượt làm theo tuần"><path d={areaPath} fill="#e9f5ff" /><path d={linePath} fill="none" stroke="#46a9ea" strokeWidth="4" />{chartPoints.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="5" fill="#46a9ea" /><text x={point.x - 10} y={point.y - 12}>{point.score.toFixed(1)}</text></g>)}</svg><div className="chart-labels">{chartPoints.map((point) => <span key={point.label}>{point.label}</span>)}</div></div> : <p className="student-list-empty">Chưa có lượt làm bài để vẽ biểu đồ.</p>}
      </article>
      <article className="teacher-card skill-card"><div className="card-heading"><div><small>ĐỘ CHÍNH XÁC TỪ BÀI LÀM ĐÃ LƯU</small><h2>Kết quả theo chủ đề</h2></div></div>{topics.length ? topics.map(({ name, accuracy }) => <div className="skill-row" key={name}><span>{name}</span><i><b className={topicColor(accuracy)} style={{ width: `${accuracy}%` }} /></i><strong>{accuracy}%</strong></div>) : <p className="student-list-empty">Chưa có dữ liệu theo chủ đề.</p>}</article>
      <article className="teacher-card donut-card"><div className="card-heading"><div><small>BÀI TẬP ĐÃ GIAO</small><h2>Tỷ lệ nộp bài</h2></div></div>{completionRate === null ? <p className="student-list-empty">Chưa có bài tập/lớp để tính tỷ lệ nộp.</p> : <><div className="donut real-donut" style={{ '--completion-rate': `${completionRate}%` }}><div><strong>{completionRate}%</strong><small>Đã nộp</small></div></div><p><span className="dot green" /> Đã nộp: {submittedCount} lượt</p><p><span className="dot gray" /> Chưa nộp: {expectedCount - submittedCount} lượt</p></>}</article>
      <article className="teacher-card ai-suggestion"><span className="ai-badge">DỮ LIỆU</span><h3>Ưu tiên ôn tập</h3>{topics.length ? <><p>Dựa trên kết quả các bài làm đã lưu:</p><b>▣ Ôn tập {topics[0].name}</b><small>Độ chính xác hiện tại: {topics[0].accuracy}% trên dữ liệu bài làm.</small><ul><li>Xem kết quả theo chủ đề</li><li>Giao bài tập ôn tập cho lớp</li></ul></> : <p>Chưa đủ bài làm để đưa ra gợi ý ôn tập theo dữ liệu.</p>}<button onClick={onOpenAssignments}>Mở bài tập　›</button></article>
    </section>
    <section className="teacher-bottom-grid">
      <article className="teacher-card assignment-table-card"><div className="card-heading"><div><small>BÀI TẬP ĐANG GIAO</small><h2>Hoạt động gần đây</h2></div><button onClick={onOpenAssignments}>Xem tất cả bài tập　›</button></div><table><thead><tr><th>Tên bài tập</th><th>Lớp</th><th>Hoàn thành</th><th>Đã nộp</th></tr></thead><tbody>{latestAssignments.length ? latestAssignments.map((assignment, index) => {
        const roster = classRosters[assignment.class_id] || [];
        const rosterIds = new Set(roster.map((student) => student.id || student.student_id));
        const submittedIds = new Set(submissions.filter((submission) => submission.assignment_id === assignment.id && rosterIds.has(submission.student_id)).map((submission) => submission.student_id));
        const progress = roster.length ? Math.round(submittedIds.size / roster.length * 100) : 0;
        return <tr key={assignment.id}><td><span className={`table-file ${['blue', 'green', 'yellow', 'purple'][index]}`}>▣</span>{assignment.title}</td><td>{roster.length} học sinh</td><td><b className="mini-progress"><i className={['blue', 'green', 'yellow', 'purple'][index]} style={{ width: `${progress}%` }} />{progress}%</b></td><td>{submittedIds.size}/{roster.length}</td></tr>;
      }) : <tr><td colSpan="4" className="student-list-empty">Chưa có bài tập nào được giao.</td></tr>}</tbody></table></article>
      <article className="teacher-card support-card"><div className="card-heading"><div><small>THEO DÕI HỌC SINH</small><h2>Ưu tiên hỗ trợ</h2></div><button onClick={onOpenStudents}>Xem học sinh</button></div>{flaggedStudents.length ? flaggedStudents.map((student) => {
        const topicsForStudent = [...new Set(attempts.filter((attempt) => attempt.student_id === student.student_id).map((attempt) => attempt.chapter || attempt.title).filter(Boolean))].slice(0, 2);
        return <div className="support-row" key={student.student_id}><span className="student-face">●</span><div><b>{student.student_name}</b><small>{topicsForStudent.length ? `Ôn tập: ${topicsForStudent.join(', ')}` : student.reasons?.[0] || 'Cần theo dõi thêm'}</small></div><strong>{student.averageScore === null ? '—' : `${(student.averageScore / 10).toFixed(1)}/10`}</strong><em className={student.risk === 'Cao' ? 'high' : 'medium'}>{student.risk}</em></div>;
      }) : <p className="student-list-empty">Chưa có học sinh cần hỗ trợ theo dữ liệu hiện tại.</p>}</article>
    </section>
  </>;
}
