import React, { useState } from 'react';
import GamePlayer from './GamePlayer.jsx';
import GameResult from './GameResult.jsx';
import { GAME_BY_ID } from './gameCatalog.js';
import './games.css';

export default function GameAssignmentView({ assignment, api, onBack, onStudyActivity }) {
  const questions = assignment.questions || [];
  const game = GAME_BY_ID[assignment.game_type];
  const [result, setResult] = useState(assignment.submission || null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isClosed = assignment.due_at && new Date(assignment.due_at).getTime() <= Date.now();

  const submit = async (answers) => {
    setPending(answers);
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/submissions', { method: 'POST', body: JSON.stringify({ assignment_id: assignment.id, answers }) });
      setResult({ ...data.submission, answers, score: data.score, correct_count: data.correctCount, total_questions: data.totalQuestions });
      setPending(null);
      onStudyActivity?.();
    } catch (submitError) {
      setError(submitError.message || 'Không thể nộp bài.');
    } finally {
      setBusy(false);
    }
  };

  const header = <div className="gm-view-head">
    <div><span className="gm-kicker">Bài tập trò chơi · {game?.name}</span><h2>{assignment.title}</h2>
      {assignment.due_at && <small>Hạn nộp: {new Date(assignment.due_at).toLocaleString('vi-VN')}</small>}</div>
    <button className="gm-back" type="button" onClick={onBack}>← Quay lại</button>
  </div>;

  if (result) {
    return <section className="gm-view">{header}
      <GameResult questions={questions} answers={result.answers} score={result.score} correct={result.correct_count} total={result.total_questions} submittedAt={result.submitted_at} feedback={result.feedback || []}>
        <button className="gm-link" type="button" onClick={onBack}>← Về danh sách bài tập</button>
      </GameResult>
    </section>;
  }
  if (isClosed) {
    return <section className="gm-view">{header}<div className="gm-start"><span className="gm-result-emoji">🔒</span><h3>Bài tập đã đóng</h3><p>Đã hết hạn nộp bài vào {new Date(assignment.due_at).toLocaleString('vi-VN')}.</p></div></section>;
  }
  if (pending) {
    return <section className="gm-view">{header}<div className="gm-start">
      {busy ? <><span className="gm-result-emoji">⏳</span><p>Đang nộp bài…</p></> : <>
        <span className="gm-result-emoji">⚠️</span><p className="gm-error">{error}</p>
        <button className="gm-primary" type="button" onClick={() => submit(pending)}>Thử nộp lại</button>
      </>}
    </div></section>;
  }
  return <section className="gm-view">{header}
    <GamePlayer gameType={assignment.game_type} questions={questions} settings={assignment.game_settings} onComplete={submit} />
  </section>;
}
