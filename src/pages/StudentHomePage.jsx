import React, { useEffect, useState } from 'react';
import LessonView from '../features/lessons/LessonView.jsx';
import AIStudyChat from '../features/assignments/AIStudyChat.jsx';
import { deduplicateLessonsBySourceNumber, getLessonChapterName, getLessonDescription, getLessonDisplayTitle, getLessonSourceCode } from '../services/learningMaterials.js';
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

function ChapterHeadingIcon({ isChapterSelected }) {
  if (isChapterSelected) {
    return <svg viewBox="0 0 64 52" aria-hidden="true" focusable="false">
      <path d="M7 9 28 5q4 0 4 4v35q-2-4-6-3L7 45z" fill="#6d42bd" stroke="#49258f" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m57 9-21-4q-4 0-4 4v35q2-4 6-3l19 4z" fill="#7450cf" stroke="#49258f" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m11 12 15-3q2 0 2 3v27q-3-2-5-1l-12 3z" fill="#fff9e9" stroke="#e8d6ff" strokeWidth="1.5" />
      <path d="m53 12-15-3q-2 0-2 3v27q3-2 5-1l12 3z" fill="#e8f8ff" stroke="#c6e8f5" strokeWidth="1.5" />
      <path d="M32 10v31" stroke="#442184" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m14 17 11-2m-11 7 11-2m14-5 11 2m-11 5 11 2" stroke="#77c9ed" strokeWidth="1.6" strokeLinecap="round" />
    </svg>;
  }

  return <svg viewBox="0 0 56 48" aria-hidden="true" focusable="false">
    <path d="m8 29 31-3 11 5-32 4z" fill="#54c9e8" stroke="#2388ae" strokeWidth="2" strokeLinejoin="round" />
    <path d="m7 24 31-4 12 5-32 5z" fill="#ed4d91" stroke="#c62d70" strokeWidth="2" strokeLinejoin="round" />
    <path d="m5 18 30-6 13 5-31 7z" fill="#56c878" stroke="#30984d" strokeWidth="2" strokeLinejoin="round" />
    <path d="m5 18 30-6v17l-30 5z" fill="#49b8dc" stroke="#2388ae" strokeWidth="2" strokeLinejoin="round" />
    <path d="m8 20 24-5v10L8 30z" fill="#dff8ff" />
    <path d="M11 22v-2m5 1v-2m5 1v-2m5 1v-2" stroke="#77c9ed" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}

function LessonIllustration({ title, index }) {
  const normalizedTitle = title.toLocaleLowerCase('vi-VN');
  const illustration = normalizedTitle.includes('sáu chữ số')
    ? 'six-digit-numbers'
    : normalizedTitle.includes('hàng và lớp')
      ? 'place-value'
      : normalizedTitle.includes('lớp triệu') || normalizedTitle.includes('1 000 000')
        ? 'millions'
        : normalizedTitle.includes('làm tròn')
          ? 'rounding'
          : normalizedTitle.includes('so sánh')
            ? 'comparison'
            : normalizedTitle.includes('dãy số tự nhiên')
              ? 'natural-sequence'
              : normalizedTitle.includes('đo góc') || normalizedTitle.includes('đơn vị đo góc')
                ? 'angle-measure'
                : normalizedTitle.includes('góc')
                  ? 'angle-types'
                  : normalizedTitle.includes('chẵn') || normalizedTitle.includes('lẻ')
                    ? 'parity'
                    : normalizedTitle.includes('chữ') || normalizedTitle.includes('biểu thức')
                      ? 'algebra'
                      : normalizedTitle.includes('phép tính') || normalizedTitle.includes('tính')
                        ? 'calculator'
                        : ['numbers', 'calculator', 'parity', 'algebra'][index % 4];

  if (illustration === 'six-digit-numbers') {
    return <svg viewBox="0 0 150 120" aria-hidden="true" focusable="false">
      <ellipse cx="75" cy="105" rx="62" ry="7" fill="rgba(112,76,34,.16)" />
      <g fontFamily="Arial,sans-serif" fontWeight="900" textAnchor="middle">
        <rect x="8" y="37" width="40" height="55" rx="9" fill="#ffb72e" stroke="#df841d" strokeWidth="3" transform="rotate(-8 28 64)" />
        <text x="28" y="77" fill="#fff" fontSize="34" transform="rotate(-8 28 64)">1</text>
        <rect x="42" y="22" width="43" height="63" rx="10" fill="#f34d4c" stroke="#bf3039" strokeWidth="3" transform="rotate(5 63 53)" />
        <text x="63" y="68" fill="#fff" fontSize="43" transform="rotate(5 63 53)">2</text>
        <rect x="80" y="34" width="48" height="61" rx="10" fill="#278be9" stroke="#1764c2" strokeWidth="3" transform="rotate(8 104 64)" />
        <text x="104" y="78" fill="#fff" fontSize="43" transform="rotate(8 104 64)">6</text>
      </g>
      <path d="m112 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#75cf7a" />
    </svg>;
  }

  if (illustration === 'place-value') {
    return <svg viewBox="0 0 130 120" aria-hidden="true" focusable="false">
      <rect x="14" y="17" width="102" height="85" rx="12" fill="#2459c7" stroke="#174094" strokeWidth="5" />
      <rect x="24" y="27" width="82" height="20" rx="5" fill="#cff4ff" />
      <g fontFamily="Arial,sans-serif" fontWeight="900" textAnchor="middle" fontSize="11">
        <rect x="24" y="55" width="23" height="18" rx="4" fill="#ffbd3e" />
        <rect x="53" y="55" width="23" height="18" rx="4" fill="#aa7bea" />
        <rect x="82" y="55" width="23" height="18" rx="4" fill="#4fd09a" />
        <text x="35.5" y="68" fill="#fff">HT</text>
        <text x="64.5" y="68" fill="#fff">CH</text>
        <text x="93.5" y="68" fill="#fff">ĐV</text>
        <rect x="24" y="79" width="23" height="15" rx="4" fill="#ff8950" />
        <rect x="53" y="79" width="23" height="15" rx="4" fill="#e75a78" />
        <rect x="82" y="79" width="23" height="15" rx="4" fill="#44bde3" />
        <text x="35.5" y="90" fill="#fff">Tr</text>
        <text x="64.5" y="90" fill="#fff">Ch</text>
        <text x="93.5" y="90" fill="#fff">Đ</text>
      </g>
      <path d="m115 12 5-8m1 21 8-3" stroke="#ffbd3e" strokeWidth="4" strokeLinecap="round" />
    </svg>;
  }

  if (illustration === 'millions') {
    return <svg viewBox="0 0 150 120" aria-hidden="true" focusable="false">
      <ellipse cx="75" cy="104" rx="64" ry="7" fill="rgba(112,76,34,.16)" />
      <rect x="10" y="25" width="130" height="67" rx="15" fill="#fff5d9" stroke="#e7a52f" strokeWidth="4" />
      <text x="75" y="68" textAnchor="middle" fill="#e34d45" fontSize="27" fontWeight="900" fontFamily="Arial,sans-serif">1 000 000</text>
      <path d="M25 80h100" stroke="#4bb8df" strokeWidth="4" strokeLinecap="round" />
      <path d="m114 74 11 6-11 6" fill="none" stroke="#278be9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m28 13 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#75cf7a" />
    </svg>;
  }

  if (illustration === 'rounding') {
    return <svg viewBox="0 0 140 120" aria-hidden="true" focusable="false">
      <path d="M18 83h104" stroke="#278be9" strokeWidth="6" strokeLinecap="round" />
      <path d="m111 72 13 11-13 11" fill="none" stroke="#278be9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="#2864aa" strokeWidth="4" strokeLinecap="round">
        <path d="M35 72v22m35-29v36m35-29v22" />
      </g>
      <circle cx="57" cy="83" r="8" fill="#f04c45" stroke="#fff" strokeWidth="3" />
      <path d="M57 69V37m0 0-12 13m12-13 12 13" fill="none" stroke="#f04c45" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="34" y="111" fill="#80502d" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">1 000</text>
      <text x="86" y="111" fill="#80502d" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">2 000</text>
      <path d="m102 23 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffbd3e" />
    </svg>;
  }

  if (illustration === 'comparison') {
    return <svg viewBox="0 0 140 120" aria-hidden="true" focusable="false">
      <path d="M70 19v72m-30 0h60m-30-72 31 12M70 19 39 31" stroke="#98602a" strokeWidth="6" strokeLinecap="round" />
      <path d="m39 31-18 38h36zm31 0L52 69h36z" fill="#dff4ff" stroke="#278be9" strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 70q14 12 28 0m-1 0q14 12 28 0" fill="none" stroke="#f2ad2c" strokeWidth="4" />
      <text x="70" y="52" textAnchor="middle" fill="#f04c45" fontSize="27" fontWeight="900" fontFamily="Arial,sans-serif">=</text>
      <path d="m112 18 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#75cf7a" />
    </svg>;
  }

  if (illustration === 'natural-sequence') {
    return <svg viewBox="0 0 140 120" aria-hidden="true" focusable="false">
      <path d="M17 78h106" stroke="#278be9" strokeWidth="6" strokeLinecap="round" />
      <path d="m112 66 13 12-13 12" fill="none" stroke="#278be9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {[30, 57, 84, 111].map((x, index) => <g key={x}>
        <circle cx={x} cy="78" r="7" fill={['#f04c45', '#ffb62e', '#35b875', '#8d62d6'][index]} stroke="#fff" strokeWidth="3" />
        <text x={x} y="57" textAnchor="middle" fill="#80502d" fontSize="17" fontWeight="900" fontFamily="Arial,sans-serif">{index + 1}</text>
      </g>)}
      <path d="m105 22 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#75cf7a" />
    </svg>;
  }

  if (illustration === 'angle-measure') {
    return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path d="M15 91a45 45 0 0 1 90 0z" fill="#dff4ff" stroke="#2589c9" strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 91a38 38 0 0 1 76 0" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M60 48v9m-19-4 2 8m-20-1 4 7m56-14-2 8m20-1-4 7m-57-26 4 7m38-7-4 7" stroke="#2589c9" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 91 38 58m22 33 36-24" stroke="#e64b4b" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 91a12 12 0 0 1 18-10" fill="none" stroke="#f2a51a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="91" r="6" fill="#f2a51a" stroke="#fff" strokeWidth="2" />
      <text x="60" y="111" textAnchor="middle" fill="#1764a4" fontSize="14" fontWeight="900" fontFamily="Arial,sans-serif">ĐỘ</text>
    </svg>;
  }

  if (illustration === 'angle-types') {
    return <svg viewBox="0 0 140 120" aria-hidden="true" focusable="false">
      <g fill="none" strokeLinecap="round" strokeWidth="7">
        <path d="M23 91h28M23 91 42 65" stroke="#35b875" />
        <path d="M70 91h30M70 91 54 66" stroke="#f0a929" />
        <path d="M111 91h22M111 91 89 91" stroke="#ef5350" />
      </g>
      <g fill="none" strokeWidth="3.5">
        <path d="M34 91a11 11 0 0 0-2-7" stroke="#188956" />
        <path d="M82 91a12 12 0 0 0-7-11" stroke="#cf8416" />
        <path d="M120 84v14" stroke="#c8393b" />
      </g>
      <g fill="#6d3d24">
        <circle cx="23" cy="91" r="4" />
        <circle cx="70" cy="91" r="4" />
        <circle cx="111" cy="91" r="4" />
      </g>
      <text x="36" y="112" textAnchor="middle" fill="#24814f" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">NHỌN</text>
      <text x="78" y="112" textAnchor="middle" fill="#a66b12" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">TÙ</text>
      <text x="120" y="112" textAnchor="middle" fill="#b82f34" fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">BẸT</text>
    </svg>;
  }

  if (illustration === 'calculator') {
    return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g transform="rotate(-10 60 60)">
        <rect x="25" y="9" width="70" height="102" rx="14" fill="#2355c8" stroke="#173a94" strokeWidth="5" />
        <rect x="36" y="20" width="48" height="19" rx="5" fill="#c5efff" />
        <rect x="37" y="48" width="19" height="19" rx="5" fill="#ffbd3e" />
        <rect x="64" y="48" width="19" height="19" rx="5" fill="#ab7bed" />
        <rect x="37" y="75" width="19" height="19" rx="5" fill="#ff8b43" />
        <rect x="64" y="75" width="19" height="19" rx="5" fill="#4fd09a" />
        <path d="M42 57h9m-4-4v9m22-5h9M42 84h9m-4-4v9m22-5h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="m101 22 5-9m2 20 8-3" stroke="#ffbd3e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="45" r="5" fill="#ffd34f" />
    </svg>;
  }

  if (illustration === 'parity') {
    return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g transform="rotate(-8 43 62)">
        <rect x="8" y="32" width="49" height="58" rx="11" fill="#f34348" stroke="#bf2936" strokeWidth="4" />
        <text x="32.5" y="75" textAnchor="middle" fill="#fff" fontSize="42" fontWeight="900" fontFamily="Arial,sans-serif">2</text>
      </g>
      <g transform="rotate(8 79 62)">
        <rect x="59" y="38" width="49" height="58" rx="11" fill="#35b875" stroke="#188956" strokeWidth="4" />
        <text x="83.5" y="81" textAnchor="middle" fill="#fff" fontSize="42" fontWeight="900" fontFamily="Arial,sans-serif">4</text>
      </g>
      <path d="m91 17 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#6bd68d" />
    </svg>;
  }

  if (illustration === 'algebra') {
    return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g transform="rotate(-8 60 62)">
        <rect x="12" y="25" width="96" height="69" rx="12" fill="#d58a39" stroke="#a95620" strokeWidth="5" />
        <rect x="21" y="33" width="78" height="51" rx="5" fill="#176346" />
        <text x="60" y="68" textAnchor="middle" fill="#fff8d8" fontSize="23" fontWeight="800" fontFamily="Arial,sans-serif">a + b</text>
        <rect x="66" y="84" width="28" height="8" rx="3" fill="#fff0be" />
      </g>
      <path d="m101 17 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#bb82f4" />
    </svg>;
  }

  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="104" rx="47" ry="7" fill="rgba(112,76,34,.16)" />
    <text x="12" y="92" fill="#ffb62e" stroke="#e88b18" strokeWidth="2" fontSize="72" fontWeight="900" fontFamily="Arial,sans-serif">1</text>
    <text x="38" y="77" fill="#f04c45" stroke="#c83238" strokeWidth="2" fontSize="76" fontWeight="900" fontFamily="Arial,sans-serif">2</text>
    <text x="68" y="99" fill="#278be9" stroke="#1764c2" strokeWidth="2" fontSize="78" fontWeight="900" fontFamily="Arial,sans-serif">3</text>
    <path d="m100 17 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#75cf7a" />
  </svg>;
}

// Kẹo gậy có nơ ở góc khung (trang trí Giáng sinh)
const Cane = ({ position }) => <span className={`christmas-candy-cane cane-${position}`} aria-hidden="true" />;
// Tất treo ở góc khung
const Stocking = ({ className = '' }) => <span className={`christmas-stocking ${className}`} aria-hidden="true" />;

export default function StudentHomePage({ api, readSession, Header, Brand, LessonView: LessonViewComponent = LessonView, AssignedWorkView, go, logout, onAskAI }) {
  const session = readSession();
  const studentId = session?.user?.id || session?.profile?.id;
  const streakKey = `mathjoy-study-streak-${session?.profile?.id || session?.user?.id || session?.profile?.email || 'student'}`;
  const studyTimeKey = `mathjoy-daily-study-time-${session?.profile?.id || session?.user?.id || session?.profile?.email || 'student'}`;
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
    if (lesson) setSelectedLesson({ ...lesson, title: getLessonDisplayTitle(lesson) });
    else setError('Không tìm thấy bài học được đề xuất.');
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
              <div className="panel-heading"><div className={`panel-heading-main ${selectedChapter ? 'chapter-selected-heading' : ''}`}><span className={`panel-heading-icon ${selectedChapter ? 'is-open-book' : 'is-book-stack'}`}><ChapterHeadingIcon isChapterSelected={Boolean(selectedChapter)} /></span><div><h2>{selectedChapter ? selectedChapter.name : 'Chọn chương học'}</h2><p>{selectedChapter ? `${selectedChapter.lessons.length} bài học trong chương` : 'Chọn một chương để xem các bài học đã xuất bản'}</p></div></div>{selectedChapter && <button className="chapter-back" type="button" onClick={() => setSelectedChapterId('')}>← Tất cả chương</button>}</div>
              {error && <p className="message error">{error}</p>}
                {loadingChapters ? <p className="lesson-empty">Đang tải chương và bài học...</p> : selectedChapter ? selectedChapter.lessons.length ? <div className="lesson-grid">{selectedChapter.lessons.map((lesson, index) => {
                  const title = getLessonDisplayTitle(lesson);
                  return <button className={`lesson ${lesson.color || ['blue', 'yellow', 'green', 'pink'][index % 4]}`} type="button" key={lesson.id} onClick={() => setSelectedLesson({ ...lesson, title })}>
                    <span className="lesson-illustration"><LessonIllustration title={title} index={index} /></span>
                    <span className="lesson-copy"><h3>{title}</h3>{getLessonDescription(lesson) && <p>{getLessonDescription(lesson)}</p>}</span>
                    {completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}
                  </button>;
                })}</div> : <p className="lesson-empty">Chương này chưa có bài học được xuất bản.</p> : chapters.length ? <div className="chapter-grid">{chapters.map((chapter, index) => <button className="chapter-card" type="button" key={chapter.id} onClick={() => setSelectedChapterId(chapter.id)}><span className="chapter-card-icon">{['📘', '🧮', '✏️', '📐'][index % 4]}</span><span className="chapter-card-copy"><small>{chapter.subject || 'Môn học'}</small><strong>{chapter.name}</strong><span>{chapter.lessons.length} bài học</span></span><span className="chapter-card-arrow" aria-hidden="true">›</span></button>)}</div> : <p className="lesson-empty">Chưa có bài học nào được xuất bản.</p>}
              </>}
        </section>
        <aside>
          <section className="daily-card christmas-frame"><h2>Mục tiêu hôm nay</h2><p>Học 15 phút mỗi ngày để duy trì thói quen học tập nhé!</p><div className="daily-progress" role="progressbar" aria-label="Thời gian học hôm nay" aria-valuemin="0" aria-valuemax={dailyStudyGoalSeconds} aria-valuenow={Math.min(dailyStudyGoalSeconds, todayStudySeconds)}><span style={{ width: `${studyProgress}%` }} /></div><small>{Math.min(15, studiedMinutes)}/15 phút</small><Cane position="br" /></section>
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