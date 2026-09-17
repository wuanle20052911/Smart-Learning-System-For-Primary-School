import React, { useEffect, useState } from 'react';

export default function StudentHomePage({ api, readSession, Header, Brand, LessonView, AIQuizGenerator, AssignedWorkView, go, logout }) {
  const [lessons, setLessons] = useState([]); const [assignments, setAssignments] = useState([]); const [error, setError] = useState(''); const [selectedLesson, setSelectedLesson] = useState(null);
  useEffect(() => { Promise.all([api('/api/lessons/published'), api('/api/assignments/published'), api('/api/submissions/mine')]).then(([l, a, s]) => { const submissions = s.submissions || []; setLessons(l.lessons || []); setAssignments((a.assignments || []).map((item) => ({ ...item, submission: submissions.find((submission) => submission.assignment_id === item.id) || null }))); }).catch((e) => setError(e.message)); }, []);
  const session = readSession(); const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0}'));
  const [completedLessons, setCompletedLessons] = useState(() => JSON.parse(localStorage.getItem('mathjoy-completed-lessons') || '[]'));
  const completeLesson = (lessonId) => {
    setProgress((value) => {
      const alreadyCompleted = completedLessons.includes(lessonId);
      const next = alreadyCompleted ? value : { ...value, lessons: value.lessons + 1, xp: value.xp + 10 };
      localStorage.setItem('mathjoy-progress', JSON.stringify(next));
      return next;
    });
    if (lessonId && !completedLessons.includes(lessonId)) {
      const nextCompleted = [...completedLessons, lessonId];
      setCompletedLessons(nextCompleted);
      localStorage.setItem('mathjoy-completed-lessons', JSON.stringify(nextCompleted));
    }
    setSelectedLesson(null);
  };
  const openAssignment = async (item) => {
    try {
      const data = await api(`/api/assignments/${item.id}`);
      setSelectedLesson({ ...data.assignment, submission: item.submission || null, isAssignment: true });
    } catch (openError) {
      setError(openError.message);
    }
  };
  return <><Header Brand={Brand} readSession={readSession} go={go} logout={logout}><button className="nav-chip">🔥 0 ngày</button>{session?.profile?.role === 'teacher' && <a className="nav-chip" href="/teacher" onClick={(e) => { e.preventDefault(); go('/teacher'); }}>Bảng giáo viên</a>}</Header><main className="home"><section className="welcome"><div><h1>Chào bạn nhỏ! 👋</h1><p>Cùng khám phá những điều thú vị trong thế giới Toán học nhé.</p></div><div className="mascot">🧮</div></section><section className="stats"><div className="stat"><span className="stat-icon">⭐</span><div><strong>{progress.xp}</strong><span>Điểm hôm nay</span></div></div><div className="stat"><span className="stat-icon">🏆</span><div><strong>{progress.lessons}</strong><span>Bài đã hoàn thành</span></div></div><div className="stat"><span className="stat-icon">🎯</span><div><strong>15 phút</strong><span>Mục tiêu mỗi ngày</span></div></div></section>{selectedLesson && <LessonView api={api} AssignedWorkView={AssignedWorkView} AIQuizGenerator={AIQuizGenerator} lesson={selectedLesson} onBack={() => setSelectedLesson(null)} onComplete={() => completeLesson(selectedLesson.id)} />}<div className="home-grid"><section className="home-panel"><div className="panel-heading"><div><h2>Tiếp tục học</h2><p>Chọn một bài để bắt đầu luyện tập</p></div><a href="#lessons">Xem tất cả</a></div>{error && <p className="message error">{error}</p>}<div className="lesson-grid">{lessons.length ? lessons.map((lesson) => <button className={`lesson ${lesson.color || 'blue'}`} key={lesson.id} onClick={() => setSelectedLesson(lesson)}><small>{lesson.subject}</small><h3>{lesson.title}</h3><p>{lesson.description}</p><span className="lesson-art">{lesson.icon || '📚'}</span>{completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}</button>) : <p className="lesson-empty">Chưa có bài học được xuất bản.</p>}</div></section><aside><section className="daily-card"><h2>Mục tiêu hôm nay</h2><p>Hoàn thành 5 câu hỏi để nhận thêm sao và giữ chuỗi học tập!</p><div className="daily-progress"><span style={{ width: `${Math.min(100, (progress.answered / 5) * 100)}%` }} /></div><small>{Math.min(5, progress.answered)}/5 câu hỏi</small></section><section className="assigned-work-card"><div className="assigned-work-heading"><div><span>📚</span><h2>Bài tập cần làm</h2></div><b>{assignments.length}</b></div><p className="assigned-work-subtitle">Bài tập cô giao cho em</p>{assignments.length ? <div className="assigned-work-list">{assignments.map((item) => <button className={`assigned-work-item ${item.submission ? 'is-done' : ''}`} key={item.id} onClick={() => openAssignment(item)}><span className="assigned-work-icon">{item.submission ? '✅' : '📝'}</span><span className="assigned-work-content"><strong>{item.title}</strong><small>{item.submission ? `Đã làm · ${item.submission.score}/100 · Bấm để xem lại` : `${item.question_count || 0} câu · ${item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Vừa' : 'Dễ'}`}</small></span><span className="assigned-work-arrow">›</span></button>)}</div> : <div className="assigned-work-empty">Hiện chưa có bài tập cô giao. 🎉</div>}</section></aside></div></main></>;
}
