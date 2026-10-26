import React, { useEffect, useState } from 'react';
import LessonView from '../features/lessons/LessonView.jsx';
import StudentLessonCatalog from '../features/lessons/StudentLessonCatalog.jsx';
import AIStudyChat from '../features/assignments/AIStudyChat.jsx';
import { deduplicateLessonsBySourceNumber, getLessonChapterName, getLessonDisplayTitle, getLessonSourceCode } from '../services/learningMaterials.js';
import fireGif from '../assets/Fire.gif';
import winterScene from '../assets/mathjoy-winter.gif';
import statsPanel from '../assets/Snowy Candy Game UI Panel.png';
import pointsIcon from '../assets/Glossy Golden Star with Sparkles.png';
import lessonsIcon from '../assets/Glossy Golden Trophy with Sparkles.png';
import studyTimeIcon from '../assets/Glossy Cartoon Stopwatch Icon.png';
import leaderboardEmblem from '../assets/leaderboard/Glossy Golden Trophy Achievement Emblem.png';
import leaderboardFirstPlace from '../assets/leaderboard/Glossy Golden First Place Trophy Badge.png';
import leaderboardSecondPlace from '../assets/leaderboard/Glossy Second Place Trophy Badge.png';
import leaderboardThirdPlace from '../assets/leaderboard/Glossy Bronze Top 3 Trophy Badge.png';

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyStudyTime(storageKey) {
  const savedTime = JSON.parse(localStorage.getItem(storageKey) || 'null');
  const today = getLocalDateKey(new Date());
  return savedTime?.date === today && Number.isFinite(savedTime.seconds) && savedTime.seconds >= 0
    ? savedTime
    : { date: today, seconds: 0 };
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

function getRecentLessons(storageKey) {
  const recentLessons = JSON.parse(localStorage.getItem(storageKey) || '[]');
  return Array.isArray(recentLessons)
    ? recentLessons.filter((item) => item && typeof item.id === 'string' && Number.isFinite(item.studiedAt))
    : [];
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

const Cane = ({ position }) => <span className={`christmas-candy-cane cane-${position}`} aria-hidden="true" />;
// Tất treo ở góc khung
const Stocking = ({ className = '' }) => <span className={`christmas-stocking ${className}`} aria-hidden="true" />;

export default function StudentHomePage({ api, readSession, Header, Brand, LessonView: LessonViewComponent = LessonView, AssignedWorkView, go, logout, onAskAI }) {
  const session = readSession();
  const studentId = session?.user?.id || session?.profile?.id;
  const streakKey = `mathjoy-study-streak-${session?.profile?.id || session?.user?.id || session?.profile?.email || 'student'}`;
  const studyTimeKey = `mathjoy-daily-study-time-${session?.profile?.id || session?.user?.id || session?.profile?.email || 'student'}`;
  const recentLessonsKey = `mathjoy-recent-lessons-${studentId || session?.profile?.email || 'student'}`;
  const dailyStudyGoalSeconds = 15 * 60;
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [error, setError] = useState('');
  const [streak, setStreak] = useState(() => getStreakCount(streakKey));
  const [dailyStudyTime, setDailyStudyTime] = useState(() => getDailyStudyTime(studyTimeKey));
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0}'));
  const [completedLessons, setCompletedLessons] = useState(() => JSON.parse(localStorage.getItem('mathjoy-completed-lessons') || '[]'));
  const [recentLessons, setRecentLessons] = useState(() => getRecentLessons(recentLessonsKey));
  const [catalogView, setCatalogView] = useState('chapter');
  const [lessonFilter, setLessonFilter] = useState('all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardPosition, setLeaderboardPosition] = useState(null);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const leaderboardIcon = leaderboardPosition === 1
    ? leaderboardFirstPlace
    : leaderboardPosition === 2
      ? leaderboardSecondPlace
      : leaderboardPosition === 3
        ? leaderboardThirdPlace
        : leaderboardEmblem;

  useEffect(() => {
    const previousScene = document.body.style.getPropertyValue('--mathjoy-winter-scene');
    document.body.classList.add('mathjoy-winter-scene');
    document.body.style.setProperty('--mathjoy-winter-scene', `url("${winterScene}")`);
    return () => {
      document.body.classList.remove('mathjoy-winter-scene');
      if (previousScene) document.body.style.setProperty('--mathjoy-winter-scene', previousScene);
      else document.body.style.removeProperty('--mathjoy-winter-scene');
    };
  }, []);

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

  useEffect(() => {
    let active = true;
    setLeaderboardLoading(true);
    api('/api/leaderboard/class')
      .then(({ leaderboard: entries = [] }) => {
        if (!active) return;
        setLeaderboardError('');
        const currentStudent = entries.find((entry) => entry.student_id === studentId);
        setLeaderboardPosition(currentStudent ? Number(currentStudent.rank_position) : null);
        if (currentStudent) {
          const totalPoints = Number(currentStudent.points);
          const totalLessons = Number(currentStudent.completed_lessons);
          setProgress((current) => {
            const updatedProgress = { ...current, xp: totalPoints, lessons: totalLessons };
            localStorage.setItem('mathjoy-progress', JSON.stringify(updatedProgress));
            return updatedProgress;
          });
        }
      })
      .catch((loadError) => {
        if (active) {
          setLeaderboardError(loadError.message || 'Không thể tải bảng xếp hạng lớp.');
          setLeaderboardPosition(null);
        }
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => { active = false; };
  }, [api, leaderboardRefresh, studentId]);

  useEffect(() => {
    if (!selectedLesson && !selectedAssignment) return undefined;

    let lastVisibleAt = document.visibilityState === 'visible' ? Date.now() : null;
    const recordElapsedTime = () => {
      if (lastVisibleAt === null) return;
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastVisibleAt) / 1000);
      lastVisibleAt += elapsedSeconds * 1000;
      if (elapsedSeconds <= 0) return;

      setDailyStudyTime((current) => {
        const today = getLocalDateKey(new Date());
        const seconds = (current.date === today ? current.seconds : 0) + elapsedSeconds;
        const updatedTime = { date: today, seconds };
        localStorage.setItem(studyTimeKey, JSON.stringify(updatedTime));
        return updatedTime;
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastVisibleAt = Date.now();
      } else {
        recordElapsedTime();
        lastVisibleAt = null;
      }
    };
    const intervalId = window.setInterval(recordElapsedTime, 15000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      recordElapsedTime();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedLesson, selectedAssignment, studyTimeKey]);

  const openAssignment = async (item) => {
    try {
      const data = await api(`/api/assignments/${item.id}`);
      setSelectedAssignment({ ...data.assignment, submission: item.submission || null, isAssignment: true });
    } catch (openError) {
      setError(openError.message);
    }
  };

  const openRecommendedLesson = (lessonId) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (lesson) openLesson(lesson);
    else setError('Không tìm thấy bài học được đề xuất.');
  };

  const openLesson = (lesson) => {
    const studiedAt = Date.now();
    const nextRecentLessons = [
      { id: lesson.id, studiedAt },
      ...recentLessons.filter((item) => item.id !== lesson.id)
    ].slice(0, 50);
    setRecentLessons(nextRecentLessons);
    localStorage.setItem(recentLessonsKey, JSON.stringify(nextRecentLessons));
    setSelectedLesson({ ...lesson, title: getLessonDisplayTitle(lesson) });
  };

  const chapters = groupLessonsByChapter(lessons);
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId);
  const todayStudySeconds = dailyStudyTime.date === getLocalDateKey(new Date()) ? dailyStudyTime.seconds : 0;
  const studyProgress = Math.min(100, (todayStudySeconds / dailyStudyGoalSeconds) * 100);
  const studiedMinutes = Math.floor(todayStudySeconds / 60);
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

  const completeLesson = async (lessonId) => {
    const alreadyCompleted = completedLessons.includes(lessonId);
    try {
      const { completion } = await api('/api/leaderboard/complete-lesson', {
        method: 'POST',
        body: JSON.stringify({ lessonId })
      });
      const totalPoints = Number(completion?.total_points);
      const totalLessons = Number(completion?.total_lessons);
      if (!Number.isSafeInteger(totalPoints) || totalPoints < 0 || !Number.isSafeInteger(totalLessons) || totalLessons < 0) {
        throw new Error('Máy chủ trả về tổng điểm hoặc số bài học không hợp lệ.');
      }

      recordStudyActivity();
      if (!alreadyCompleted) {
        const nextCompleted = [...completedLessons, lessonId];
        setCompletedLessons(nextCompleted);
        localStorage.setItem('mathjoy-completed-lessons', JSON.stringify(nextCompleted));
      }
      setProgress((current) => {
        const updatedProgress = {
          ...current,
          lessons: totalLessons,
          xp: totalPoints
        };
        localStorage.setItem('mathjoy-progress', JSON.stringify(updatedProgress));
        return updatedProgress;
      });
      setLeaderboardError('');
      setLeaderboardRefresh((current) => current + 1);
      setSelectedLesson(null);
    } catch (completionError) {
      setLeaderboardError(completionError.message || 'Không thể ghi nhận điểm hoàn thành bài học.');
    }
  };

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout}>
      <span className="nav-chip streak-chip" aria-label={`Chuỗi học liên tục: ${streak} ngày`}>
        <span className="streak-chip-bulb"><img src={fireGif} alt="" /></span>
        <span className="streak-chip-value">{streak} ngày</span>
      </span>
      <a
        className="nav-chip leaderboard-chip"
        href="/leaderboard"
        onClick={(event) => { event.preventDefault(); go('/leaderboard'); }}
        aria-label={leaderboardPosition ? `Bảng xếp hạng em chăm, hạng ${leaderboardPosition}` : 'Mở bảng xếp hạng em chăm'}
        title={leaderboardError || 'Mở bảng xếp hạng em chăm'}
      >
        <img className={`leaderboard-chip-icon ${leaderboardPosition >= 1 && leaderboardPosition <= 3 ? 'is-rank-badge' : 'is-default-emblem'}`} src={leaderboardIcon} alt="" />
      </a>
      {session?.profile?.role === 'teacher' && <a className="nav-chip" href="/teacher" onClick={(event) => { event.preventDefault(); go('/teacher'); }}>Bảng giáo viên</a>}
    </Header>
    <main className={`home ${selectedLesson ? 'lesson-focus-mode' : ''}`}>
      <section className="stats">
        <div className="stat stat-score" style={{ backgroundImage: `url("${statsPanel}")` }}><img className="stat-icon" src={pointsIcon} alt="" /><div className="stat-content"><strong>{progress.xp}</strong><span>Tổng điểm học tập</span></div></div>
        <div className="stat stat-lessons" style={{ backgroundImage: `url("${statsPanel}")` }}><img className="stat-icon" src={lessonsIcon} alt="" /><div className="stat-content"><strong>{progress.lessons}</strong><span>Bài đã hoàn thành</span></div></div>
        <div className="stat daily-time-stat" style={{ backgroundImage: `url("${statsPanel}")` }}><img className="stat-icon" src={studyTimeIcon} alt="" /><div className="daily-time-stat-content"><strong>{Math.min(15, studiedMinutes)}/15 phút</strong><span>Thời gian học hôm nay</span><div className="daily-time-progress" role="progressbar" aria-label="Thời gian học hôm nay" aria-valuemin="0" aria-valuemax={dailyStudyGoalSeconds} aria-valuenow={Math.min(dailyStudyGoalSeconds, todayStudySeconds)}><span style={{ width: `${studyProgress}%` }} /></div></div></div>
      </section>
      <div className="home-grid">
        <section className="home-panel christmas-frame">
          <Cane position="tl" />
          <Cane position="tr" />
          {selectedAssignment ? <AssignedWorkView assignment={selectedAssignment} onBack={() => setSelectedAssignment(null)} onStudyActivity={recordStudyActivity} api={api} /> : selectedLesson ? <LessonViewComponent api={api} AssignedWorkView={AssignedWorkView} lesson={selectedLesson} onBack={() => setSelectedLesson(null)} onComplete={() => completeLesson(selectedLesson.id)} onStudyActivity={recordStudyActivity} /> : <>
              <StudentLessonCatalog
                chapters={chapters}
                selectedChapter={selectedChapter}
                loading={loadingChapters}
                error={error}
                completedLessons={completedLessons}
                recentLessons={recentLessons}
                lessonFilter={lessonFilter}
                catalogView={catalogView}
                onLessonFilterChange={setLessonFilter}
                onCatalogViewChange={(view) => {
                  setSelectedChapterId('');
                  setCatalogView(view);
                }}
                onSelectChapter={setSelectedChapterId}
                onSelectLesson={openLesson}
                onBackToChapters={() => setSelectedChapterId('')}
              />
              </>}
        </section>
        <aside>
          <section className="daily-card christmas-frame"><h2>Mục tiêu hôm nay</h2><p>Học 15 phút mỗi ngày để duy trì thói quen học tập nhé!</p><div className="daily-progress" role="progressbar" aria-label="Thời gian học hôm nay" aria-valuemin="0" aria-valuemax={dailyStudyGoalSeconds} aria-valuenow={Math.min(dailyStudyGoalSeconds, todayStudySeconds)}><span style={{ width: `${studyProgress}%` }} /></div><small>{Math.min(15, studiedMinutes)}/15 phút</small><Cane position="br" /></section>
          <section className="meteor-game-card christmas-frame">
            <button className="meteor-game-artwork" type="button" onClick={() => go('/meteor-game')} aria-label="Chơi game Bắn Thiên Thạch">
              <img src="/public/img/B%E1%BA%AFn%20Thi%C3%AAn%20Th%E1%BA%A1ch_%20Neon%20Space%20Battle.png" alt="Bắn Thiên Thạch" />
            </button>
          </section>
          <section className="assigned-work-card christmas-frame"><Cane position="tr" /><div className="assigned-work-heading"><div><span>📚</span><h2>Bài tập cần làm</h2></div><b>{assignments.length}</b></div><p className="assigned-work-subtitle">Bài tập cô giao cho em</p>{assignments.length ? <div className="assigned-work-list">{assignments.map((item) => {
            const isClosed = item.due_at && new Date(item.due_at).getTime() <= Date.now();
            const canReview = Boolean(item.submission);
            return <button className={`assigned-work-item ${item.submission ? 'is-done' : ''} ${isClosed && !canReview ? 'is-closed' : ''}`} key={item.id} onClick={() => openAssignment(item)} disabled={isClosed && !canReview}>
              <span className="assigned-work-icon">{item.submission ? '✅' : isClosed ? '🔒' : '📝'}</span>
              <span className="assigned-work-content"><strong>{item.title}</strong><small>{item.submission ? `Đã làm · ${item.submission.score}/100${item.submission.feedback?.length ? ' · Cô đã nhận xét' : ''} · Bấm để xem lại` : isClosed ? 'Đã hết hạn nộp' : `${item.question_count || 0} câu · ${item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Vừa' : 'Dễ'}`}{item.due_at ? ` · Hạn: ${new Date(item.due_at).toLocaleString('vi-VN')}` : ''}</small></span>
              <span className="assigned-work-arrow">{isClosed && !canReview ? 'Đã đóng' : '›'}</span>
            </button>;
          })}</div> : <div className="assigned-work-empty">Hiện chưa có bài tập cô giao. 🎉</div>}<Stocking className="stocking-bl" /></section>
        </aside>
      </div>
    </main>
    <AIStudyChat
      api={api}
      onOpenLesson={openRecommendedLesson}
      onOpenAssignment={(assignmentId) => {
        const assignment = assignments.find((item) => item.id === assignmentId);
        if (assignment) openAssignment(assignment);
        else setError('Không tìm thấy bài tập được đề xuất.');
      }}
    />
    {onAskAI && <button className="ai-fab" type="button" onClick={onAskAI}><span aria-hidden="true">✨</span> Hỏi AI học gì?</button>}
  </>;
}