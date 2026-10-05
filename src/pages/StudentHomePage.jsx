import React, { useEffect, useState } from 'react';
import LessonView from '../features/lessons/LessonView.jsx';
import { deduplicateLessonsBySourceNumber, getLessonChapterName, getLessonDisplayTitle, getLessonSourceCode } from '../services/learningMaterials.js';
import fireGif from '../../gif/Fire.gif';

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStreakCount(streakKey) {
  const savedStreak = JSON.parse(localStorage.getItem(streakKey) || 'null');
  const count = Number(savedStreak?.count);
  if (!Number.isInteger(count) || count < 1) return 0;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastStudyDate = savedStreak?.lastStudyDate;
  return lastStudyDate === getLocalDateKey(today) || lastStudyDate === getLocalDateKey(yesterday) ? count : 0;
}

function groupLessonsByChapter(lessons) {
  const chapters = new Map();
  lessons.forEach((lesson) => {
    const sourceCode = getLessonSourceCode(lesson);
    const name = getLessonChapterName(lesson);
    const id = sourceCode ? `source-chapter-${lesson.subject || ''}-${sourceCode.chapterNumber}` : lesson.topic_id || `${lesson.subject || ''}:${lesson.grade || ''}:${name}`;
    if (!chapters.has(id)) chapters.set(id, { id, name, subject: lesson.subject, lessons: [] });
    chapters.get(id).lessons.push(lesson);
  });
  return Array.from(chapters.values())
    .map((chapter) => ({
      ...chapter,
      lessons: deduplicateLessonsBySourceNumber(chapter.lessons).sort((left, right) => {
        const leftCode = getLessonSourceCode(left)?.lessonNumber;
        const rightCode = getLessonSourceCode(right)?.lessonNumber;
        if (leftCode !== undefined && rightCode !== undefined && leftCode !== rightCode) return leftCode - rightCode;
        return getLessonDisplayTitle(left).localeCompare(getLessonDisplayTitle(right), undefined, { numeric: true, sensitivity: 'base' });
      })
    }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

// Kẹo gậy có nơ ở góc khung (trang trí Giáng sinh)
const Cane = ({ position }) => <span className={`christmas-candy-cane cane-${position}`} aria-hidden="true" />;
// Tất treo ở góc khung
const Stocking = ({ className = '' }) => <span className={`christmas-stocking ${className}`} aria-hidden="true" />;

export default function StudentHomePage({ api, readSession, Header, Brand, LessonView: LessonViewComponent = LessonView, AssignedWorkView, go, logout, onAskAI }) {
  const session = readSession();
  const streakKey = `mathjoy-study-streak-${session?.profile?.id || session?.user?.id || session?.profile?.email || 'student'}`;
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [error, setError] = useState('');
  const [streak, setStreak] = useState(() => getStreakCount(streakKey));
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0}'));
  const [completedLessons, setCompletedLessons] = useState(() => JSON.parse(localStorage.getItem('mathjoy-completed-lessons') || '[]'));

  useEffect(() => {
    Promise.all([api('/api/lessons/published'), api('/api/assignments/published'), api('/api/submissions/mine')])
      .then(([lessonData, assignmentData, submissionData]) => {
        const submissions = submissionData.submissions || [];
        setLessons(lessonData.lessons || []);
        setAssignments((assignmentData.assignments || []).map((item) => ({
          ...item,
          submission: submissions.find((submission) => submission.assignment_id === item.id) || null
        })));
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoadingChapters(false));
  }, []);

  const openAssignment = async (item) => {
    try {
      const data = await api(`/api/assignments/${item.id}`);
      setSelectedAssignment({ ...data.assignment, submission: item.submission || null, isAssignment: true });
    } catch (openError) {
      setError(openError.message);
    }
  };

  const chapters = groupLessonsByChapter(lessons);
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId);

  const recordStudyActivity = () => {
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const savedStreak = JSON.parse(localStorage.getItem(streakKey) || 'null');
    const previousCount = Number(savedStreak?.count);
    const count = savedStreak?.lastStudyDate === todayKey
      ? (Number.isInteger(previousCount) && previousCount > 0 ? previousCount : 1)
      : savedStreak?.lastStudyDate === getLocalDateKey(yesterday) && Number.isInteger(previousCount) && previousCount > 0
        ? previousCount + 1
        : 1;
    localStorage.setItem(streakKey, JSON.stringify({ count, lastStudyDate: todayKey }));
    setStreak(count);
  };

  const completeLesson = (lessonId) => {
    recordStudyActivity();
    if (!completedLessons.includes(lessonId)) {
      const nextCompleted = [...completedLessons, lessonId];
      setCompletedLessons(nextCompleted);
      localStorage.setItem('mathjoy-completed-lessons', JSON.stringify(nextCompleted));
      setProgress((current) => {
        const updatedProgress = { ...current, lessons: current.lessons + 1, xp: current.xp + 10 };
        localStorage.setItem('mathjoy-progress', JSON.stringify(updatedProgress));
        return updatedProgress;
      });
    }
    setSelectedLesson(null);
  };

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout}>
      <span className="nav-chip streak-chip" aria-label={`Chuỗi học liên tục: ${streak} ngày`}>
        <span className="streak-chip-bulb"><img src={fireGif} alt="" /></span>
        <span className="streak-chip-value">{streak} ngày</span>
      </span>
      {session?.profile?.role === 'teacher' && <a className="nav-chip" href="/teacher" onClick={(event) => { event.preventDefault(); go('/teacher'); }}>Bảng giáo viên</a>}
    </Header>
    <main className="home">
      <section className="welcome">
        <div className="welcome-box">
          <h1>Chào bạn nhỏ! 👋</h1>
          <p>Cùng khám phá những điều thú vị trong thế giới Toán học nhé.</p>
          <Cane position="tl" />
          <Cane position="tr" />
          <Cane position="br" />
        </div>
      </section>
      <section className="stats">
        <div className="stat"><span className="stat-icon">⭐</span><div><strong>{progress.xp}</strong><span>Điểm hôm nay</span></div><Stocking /></div>
        <div className="stat"><span className="stat-icon">🏆</span><div><strong>{progress.lessons}</strong><span>Bài đã hoàn thành</span></div><Stocking /></div>
        <div className="stat"><span className="stat-icon">🎯</span><div><strong>15 phút</strong><span>Mục tiêu mỗi ngày</span></div><Stocking /></div>
      </section>
      <div className="home-grid">
        <section className="home-panel christmas-frame">
          <Cane position="tl" />
          <Cane position="tr" />
          {selectedAssignment ? <AssignedWorkView assignment={selectedAssignment} onBack={() => setSelectedAssignment(null)} onStudyActivity={recordStudyActivity} api={api} /> : selectedLesson ? <LessonViewComponent api={api} AssignedWorkView={AssignedWorkView} lesson={selectedLesson} onBack={() => setSelectedLesson(null)} onComplete={() => completeLesson(selectedLesson.id)} onStudyActivity={recordStudyActivity} /> : <>
              <div className="panel-heading"><div><h2>{selectedChapter ? selectedChapter.name : 'Chọn chương học'}</h2><p>{selectedChapter ? `${selectedChapter.lessons.length} bài học trong chương` : 'Chọn một chương để xem các bài học đã xuất bản'}</p></div>{selectedChapter && <button className="chapter-back" type="button" onClick={() => setSelectedChapterId('')}>← Tất cả chương</button>}</div>
              {error && <p className="message error">{error}</p>}
                {loadingChapters ? <p className="lesson-empty">Đang tải chương và bài học...</p> : selectedChapter ? selectedChapter.lessons.length ? <div className="lesson-grid">{selectedChapter.lessons.map((lesson, index) => <button className={`lesson ${lesson.color || ['blue', 'yellow', 'green', 'pink'][index % 4]}`} type="button" key={lesson.id} onClick={() => setSelectedLesson({ ...lesson, title: getLessonDisplayTitle(lesson) })}><small>{lesson.subject} · {lesson.grade}</small><h3>{getLessonDisplayTitle(lesson)}</h3><p>{lesson.description || 'Mở nội dung bài học'}</p><span className="lesson-art">{lesson.icon || '📚'}</span>{completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}</button>)}</div> : <p className="lesson-empty">Chương này chưa có bài học được xuất bản.</p> : chapters.length ? <div className="chapter-grid">{chapters.map((chapter, index) => <button className="chapter-card" type="button" key={chapter.id} onClick={() => setSelectedChapterId(chapter.id)}><span className="chapter-card-icon">{['📘', '🧮', '✏️', '📐'][index % 4]}</span><span className="chapter-card-copy"><small>{chapter.subject || 'Môn học'}</small><strong>{chapter.name}</strong><span>{chapter.lessons.length} bài học</span></span><span className="chapter-card-arrow" aria-hidden="true">›</span></button>)}</div> : <p className="lesson-empty">Chưa có bài học nào được xuất bản.</p>}
              </>}
        </section>
        <aside>
          <section className="daily-card christmas-frame"><h2>Mục tiêu hôm nay</h2><p>Hoàn thành 5 câu hỏi để nhận thêm sao và giữ chuỗi học tập!</p><div className="daily-progress"><span style={{ width: `${Math.min(100, (progress.answered / 5) * 100)}%` }} /></div><small>{Math.min(5, progress.answered)}/5 câu hỏi</small><Cane position="br" /></section>
          <section className="assigned-work-card christmas-frame"><Cane position="tr" /><div className="assigned-work-heading"><div><span>📚</span><h2>Bài tập cần làm</h2></div><b>{assignments.length}</b></div><p className="assigned-work-subtitle">Bài tập cô giao cho em</p>{assignments.length ? <div className="assigned-work-list">{assignments.map((item) => {
            const isClosed = item.due_at && new Date(item.due_at).getTime() <= Date.now();
            const canReview = Boolean(item.submission);
            return <button className={`assigned-work-item ${item.submission ? 'is-done' : ''} ${isClosed && !canReview ? 'is-closed' : ''}`} key={item.id} onClick={() => openAssignment(item)} disabled={isClosed && !canReview}>
              <span className="assigned-work-icon">{item.submission ? '✅' : isClosed ? '🔒' : '📝'}</span>
              <span className="assigned-work-content"><strong>{item.title}</strong><small>{item.submission ? `Đã làm · ${item.submission.score}/100 · Bấm để xem lại` : isClosed ? 'Đã hết hạn nộp' : `${item.question_count || 0} câu · ${item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Vừa' : 'Dễ'}`}{item.due_at ? ` · Hạn: ${new Date(item.due_at).toLocaleString('vi-VN')}` : ''}</small></span>
              <span className="assigned-work-arrow">{isClosed && !canReview ? 'Đã đóng' : '›'}</span>
            </button>;
          })}</div> : <div className="assigned-work-empty">Hiện chưa có bài tập cô giao. 🎉</div>}<Stocking className="stocking-bl" /></section>
        </aside>
      </div>
    </main>
    {onAskAI && <button className="ai-fab" type="button" onClick={onAskAI}><span aria-hidden="true">✨</span> Hỏi AI học gì?</button>}
  </>;
}