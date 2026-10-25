import React, { useEffect, useState } from 'react';

export default function StudentLeaderboardPage({ api, readSession, Header, Brand, go, logout }) {
  const session = readSession();
  const studentId = session?.user?.id || session?.profile?.id;
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('/api/leaderboard/class')
      .then(({ leaderboard: entries = [] }) => {
        if (active) setLeaderboard(entries);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Không thể tải bảng xếp hạng lớp.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [api]);

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout} />
    <main className="home leaderboard-page">
      <a className="leaderboard-back-link" href="/learn" onClick={(event) => { event.preventDefault(); go('/learn'); }}>← Về trang học tập</a>
      <section className="leaderboard-card christmas-frame" aria-labelledby="leaderboard-title">
        <div className="leaderboard-page-heading">
          <span aria-hidden="true">🏆</span>
          <div><h1 id="leaderboard-title">Bảng xếp hạng em chăm</h1><p>Thi đua học tập cùng các bạn trong lớp nhé!</p></div>
        </div>
        {error ? <p className="leaderboard-message is-error" role="alert">{error}</p> : loading ? <p className="leaderboard-message">Đang tải bảng xếp hạng...</p> : leaderboard.length ? <>
          <p className="leaderboard-subtitle">Lớp {leaderboard[0].class_name} · Xếp hạng theo tổng điểm học tập</p>
          <ol className="leaderboard-list">
            {leaderboard.map((entry) => (
              <li className={`leaderboard-item ${entry.student_id === studentId ? 'is-current-student' : ''}`} key={entry.student_id}>
                <span className={`leaderboard-rank rank-${entry.rank_position}`}>{entry.rank_position <= 3 ? ['🥇', '🥈', '🥉'][entry.rank_position - 1] : entry.rank_position}</span>
                <span className="leaderboard-student-name">{entry.student_name}{entry.student_id === studentId ? ' (Em)' : ''}</span>
                <strong>{entry.points} điểm</strong>
              </li>
            ))}
          </ol>
        </> : <p className="leaderboard-message">Em chưa được xếp vào lớp nào.</p>}
      </section>
    </main>
  </>;
}
