import React, { useEffect, useMemo, useRef, useState } from 'react';
import goldBadge from '../assets/leaderboard/Glossy Golden First Place Trophy Badge.png';
import silverBadge from '../assets/leaderboard/Glossy Second Place Trophy Badge.png';
import bronzeBadge from '../assets/leaderboard/Glossy Bronze Top 3 Trophy Badge.png';
import { TitleBanner, GlowTrophy, Medal, FrameSparkles, SparkRays } from '../features/leaderboard/LeaderboardArt.jsx';

const BADGES = { 1: goldBadge, 2: silverBadge, 3: bronzeBadge };
const AVATAR_COLORS = ['#ff8a5b', '#5aa8f5', '#7bd3a6', '#b78cff', '#ffb84d', '#ff7aa8', '#4fc3c8', '#9ccc65'];
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function colorFor(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Điểm đếm tăng dần khi trang mở
function CountUp({ value, duration = 1100, delay = 0 }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0));
  useEffect(() => {
    if (reduceMotion()) { setShown(value); return undefined; }
    let frame;
    let start;
    const timer = window.setTimeout(() => {
      const step = (time) => {
        if (start === undefined) start = time;
        const progress = Math.min(1, (time - start) / duration);
        setShown(Math.round(value * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, delay);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [value, duration, delay]);
  return <>{shown.toLocaleString('vi-VN')}</>;
}

function Avatar({ entry, size = 'md' }) {
  return <span className={`lb-avatar lb-avatar-${size}`} style={{ '--avatar': colorFor(entry.student_id) }} aria-hidden="true">{initials(entry.student_name)}</span>;
}

function Crown() {
  return <svg className="lb-crown" viewBox="0 0 64 44" aria-hidden="true"><path d="M6 38 2 10l16 12L32 2l14 20 16-12-4 28Z" fill="#ffd23f" stroke="#c98a10" strokeWidth="3.5" strokeLinejoin="round" /><rect x="5" y="35" width="54" height="8" rx="3" fill="#ffbf1f" stroke="#c98a10" strokeWidth="3" /><circle cx="32" cy="26" r="4" fill="#ff5a64" /><circle cx="17" cy="29" r="3" fill="#5fd6ff" /><circle cx="47" cy="29" r="3" fill="#6ee59a" /></svg>;
}

function PodiumSpot({ entry, place, isMe, delay }) {
  if (!entry) {
    return <div className={`lb-podium-spot place-${place} is-empty`} style={{ '--delay': `${delay}ms` }}>
      <span className="lb-avatar lb-avatar-lg lb-avatar-empty" aria-hidden="true">?</span>
      <span className="lb-podium-name">Chờ bạn mới</span>
      <div className="lb-podium-block"><span className="lb-podium-number">{place}</span></div>
    </div>;
  }
  const tier = Math.min(3, Number(entry.rank_position) || place);
  return <div className={`lb-podium-spot place-${place} tier-${tier}${isMe ? ' is-me' : ''}`} style={{ '--delay': `${delay}ms` }}>
    {tier === 1 && <><span className="lb-halo" aria-hidden="true" /><Crown /></>}
    <Avatar entry={entry} size="lg" />
    <span className="lb-podium-name">{entry.student_name}{isMe && <em> (Em)</em>}</span>
    <span className="lb-podium-points"><CountUp value={Number(entry.points)} delay={delay + 300} /> điểm</span>
    <div className="lb-podium-block">
      <img className="lb-podium-badge" src={BADGES[entry.rank_position] || BADGES[3]} alt="" />
      <span className="lb-podium-number">{entry.rank_position}</span>
    </div>
  </div>;
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 42 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    drift: (Math.random() - 0.5) * 220,
    spin: Math.random() * 720 - 360,
    color: ['#ff5a64', '#ffd23f', '#3d8ee6', '#6ee59a', '#ff8a3d', '#b78cff'][i % 6]
  })), []);
  if (reduceMotion()) return null;
  return <div className="lb-confetti" aria-hidden="true">{pieces.map((piece, i) => <i key={i} style={{ left: `${piece.left}%`, background: piece.color, animationDelay: `${piece.delay}s`, '--drift': `${piece.drift}px`, '--spin': `${piece.spin}deg` }} />)}</div>;
}

export default function StudentLeaderboardPage({ api, readSession, Header, Brand, go, logout }) {
  const session = readSession();
  const studentId = session?.user?.id || session?.profile?.id;
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const myRowRef = useRef(null);

  useEffect(() => {
    let active = true;
    api('/api/leaderboard/class')
      .then(({ leaderboard: entries = [] }) => { if (active) setLeaderboard(entries); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Không thể tải bảng xếp hạng lớp.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);

  const entries = useMemo(() => [...leaderboard].sort((a, b) => a.rank_position - b.rank_position || String(a.student_name).localeCompare(String(b.student_name), 'vi')), [leaderboard]);
  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const me = entries.find((entry) => entry.student_id === studentId);
  const topPoints = Math.max(1, ...entries.map((entry) => Number(entry.points) || 0));
  const ahead = me ? entries.filter((entry) => Number(entry.points) > Number(me.points)).sort((a, b) => a.points - b.points)[0] : null;
  const meInTop = me && entries.indexOf(me) < 3;

  useEffect(() => {
    if (!me || meInTop || !myRowRef.current) return undefined;
    const timer = window.setTimeout(() => myRowRef.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }), 1600);
    return () => window.clearTimeout(timer);
  }, [me, meInTop]);

  let body;
  if (error) body = <p className="lb-message is-error" role="alert">{error}</p>;
  else if (loading) body = <p className="lb-message">Đang tải bảng xếp hạng...</p>;
  else if (!entries.length) body = <p className="lb-message">Em chưa được xếp vào lớp nào.</p>;
  else {
    body = <>
      <p className="lb-subtitle">Lớp <b>{entries[0].class_name}</b> • Xếp hạng theo tổng điểm học tập · {entries.length} bạn</p>

      {me && <section className="lb-me" aria-label="Vị trí của em">
        <SparkRays />
        <Medal rank={Number(me.rank_position)} />
        <div className="lb-me-text">
          <strong>{me.student_name} <em>(Em)</em></strong>
          <span>Hạng <b>{me.rank_position}</b>/{entries.length} · {ahead
            ? <>còn <b>{Number(ahead.points) - Number(me.points) + 1} điểm</b> nữa là vượt bạn {ahead.student_name}!</>
            : entries.length > 1 ? 'em đang dẫn đầu lớp, giữ vững nhé!' : 'mời thêm bạn bè cùng thi đua nhé!'}</span>
        </div>
        <span className="lb-me-points"><CountUp value={Number(me.points)} delay={200} /> điểm</span>
      </section>}

      <div className="lb-podium" role="list" aria-label="Ba bạn dẫn đầu">
        {[[topThree[1], 2, 250], [topThree[0], 1, 0], [topThree[2], 3, 450]].map(([entry, place, delay]) => <div role="listitem" key={place} className="lb-podium-cell">
          <PodiumSpot entry={entry} place={place} isMe={entry?.student_id === studentId} delay={delay} />
        </div>)}
      </div>

      {rest.length > 0 && <ol className="lb-list" start={4} aria-label="Các bạn còn lại">
        {rest.map((entry, index) => {
          const isMe = entry.student_id === studentId;
          return <li key={entry.student_id} ref={isMe ? myRowRef : undefined} className={`lb-row${isMe ? ' is-me' : ''}`} style={{ '--i': index, '--pct': `${Math.round((Number(entry.points) / topPoints) * 100)}%` }}>
            <Medal rank={Number(entry.rank_position)} />
            <Avatar entry={entry} />
            <span className="lb-row-main">
              <span className="lb-row-name">{entry.student_name}{isMe && <em className="lb-me-tag">Em</em>}</span>
              <span className="lb-bar" aria-hidden="true"><span /></span>
              <small>📖 {entry.completed_lessons} bài học đã hoàn thành</small>
            </span>
            <span className="lb-row-points"><CountUp value={Number(entry.points)} delay={700 + index * 60} /> điểm</span>
          </li>;
        })}
      </ol>}

      <p className="lb-tip">⭐ Hoàn thành bài học và luyện tập mỗi ngày để tăng điểm nhé!</p>
    </>;
  }

  return <>
    <Header Brand={Brand} readSession={readSession} go={go} logout={logout} />
    <main className="home lb-page">
      <a className="lb-back" href="/learn" onClick={(event) => { event.preventDefault(); go('/learn'); }}><span aria-hidden="true">←</span> Về trang học tập</a>
      <section className="lb-card" aria-labelledby="leaderboard-title">
        <FrameSparkles />
        {meInTop && <Confetti />}
        <TitleBanner title="Bảng xếp hạng em chăm" id="leaderboard-title" />
        <div className="lb-intro"><GlowTrophy /><p className="lb-tagline">Thi đua học tập cùng các bạn trong lớp nhé!</p></div>
        {body}
      </section>
    </main>
  </>;
}
