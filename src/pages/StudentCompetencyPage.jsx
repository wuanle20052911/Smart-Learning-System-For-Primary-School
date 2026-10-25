import React, { useEffect, useMemo, useState } from 'react';

function summarizeAttempts(attempts) {
  const competencies = new Map();
  attempts.forEach((attempt) => {
    const title = attempt.title?.trim() || 'Bài luyện tập';
    const chapter = attempt.chapter?.trim() || 'Chưa phân chương';
    const key = `${chapter}\u0000${title}`;
    const item = competencies.get(key) || { title, chapter, attempts: 0, correct: 0, total: 0, latestAt: attempt.created_at };
    item.attempts += 1;
    item.correct += Number(attempt.score) || 0;
    item.total += Number(attempt.total) || 0;
    if (new Date(attempt.created_at) > new Date(item.latestAt)) item.latestAt = attempt.created_at;
    competencies.set(key, item);
  });
  return [...competencies.values()].sort((left, right) => left.chapter.localeCompare(right.chapter, 'vi') || left.title.localeCompare(right.title, 'vi'));
}

export default function StudentCompetencyPage({ api, readSession, Header, Brand, go, logout }) {
  const session = readSession();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/attempts/mine')
      .then((data) => setAttempts(data.attempts || []))
      .catch((loadError) => setError(loadError.message || 'Không thể tải hồ sơ năng lực.'))
      .finally(() => setLoading(false));
  }, [api]);

  const competencies = useMemo(() => summarizeAttempts(attempts), [attempts]);
  const summary = useMemo(() => {
    const correct = attempts.reduce((sum, attempt) => sum + (Number(attempt.score) || 0), 0);
    const total = attempts.reduce((sum, attempt) => sum + (Number(attempt.total) || 0), 0);
    const average = attempts.length
      ? Math.round(attempts.reduce((sum, attempt) => {
        const score = Number(attempt.score) || 0;
        const questionCount = Number(attempt.total) || 0;
        return sum + (questionCount ? score / questionCount * 100 : 0);
      }, 0) / attempts.length)
      : 0;
    return { correct, total, accuracy: total ? Math.round(correct / total * 100) : 0, average };
  }, [attempts]);

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout} />
    <main className="account-page student-competency-page">
      <a className="back-link" href="/learn" onClick={(event) => { event.preventDefault(); go('/learn'); }}>← Về trang học tập</a>
      <div className="student-competency-page-heading">
        <div><span className="student-competency-eyebrow">HÀNH TRÌNH HỌC TẬP CỦA EM</span><h1>Hồ sơ năng lực</h1><p>{session?.profile?.full_name ? `Cùng xem ${session.profile.full_name} đang tiến bộ thế nào nhé!` : 'Xem kết quả luyện tập và những kỹ năng em đang rèn luyện.'}</p></div>
        <span className="student-competency-trophy" aria-hidden="true">🏅</span>
      </div>
      {error && <div className="student-competency-alert" role="alert">{error}</div>}
      {loading ? <section className="account-card student-competency-empty">Đang tải kết quả học tập...</section> : <>
        <section className="student-competency-summary" aria-label="Tổng quan kết quả học tập">
          <article className="student-competency-stat"><span>🎯</span><strong>{summary.accuracy}%</strong><small>Độ chính xác chung</small></article>
          <article className="student-competency-stat"><span>📝</span><strong>{attempts.length}</strong><small>Lượt luyện tập</small></article>
          <article className="student-competency-stat"><span>✅</span><strong>{summary.correct}/{summary.total}</strong><small>Câu trả lời đúng</small></article>
          <article className="student-competency-stat"><span>⭐</span><strong>{summary.average}%</strong><small>Điểm trung bình</small></article>
        </section>
        <section className="account-card student-competency-card">
          <div className="student-competency-section-heading"><div><span className="student-competency-eyebrow">KẾT QUẢ THEO CHỦ ĐỀ</span><h2>Kỹ năng của em</h2></div><a href="/history" onClick={(event) => { event.preventDefault(); go('/history'); }}>Xem lịch sử làm bài →</a></div>
          {competencies.length ? <div className="student-competency-list">{competencies.map((item) => {
            const accuracy = item.total ? Math.round(item.correct / item.total * 100) : 0;
            return <article className="student-competency-item" key={`${item.chapter}-${item.title}`}>
              <div className="student-competency-item-heading"><div><small>{item.chapter}</small><strong>{item.title}</strong></div><b>{accuracy}%</b></div>
              <div className="student-competency-progress" role="progressbar" aria-label={`Độ chính xác ${item.title}`} aria-valuenow={accuracy} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${accuracy}%` }} /></div>
              <div className="student-competency-item-footer"><span>{item.correct}/{item.total} câu đúng</span><span>{item.attempts} lượt làm</span><time>{new Date(item.latestAt).toLocaleDateString('vi-VN')}</time></div>
            </article>;
          })}</div> : <div className="student-competency-empty"><span>🌱</span><strong>Chưa có kết quả luyện tập</strong><p>Hoàn thành một lượt luyện tập, hồ sơ năng lực sẽ cập nhật tại đây.</p><a href="/learn" onClick={(event) => { event.preventDefault(); go('/learn'); }}>Bắt đầu học nào →</a></div>}
        </section>
      </>}
    </main>
  </>;
}
