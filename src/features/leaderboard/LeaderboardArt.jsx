import React from 'react';

const INK = '#8a4b10';

function Star4({ className = '', style }) {
  return <svg className={className} style={style} viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1c2.4 9.6 5.4 12.6 15 15-9.6 2.4-12.6 5.4-15 15-2.4-9.6-5.4-12.6-15-15C10.6 13.6 13.6 10.6 16 1Z" fill="#fff6b0" stroke="#ffcc33" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

function Star5({ x, y, r = 14, className = '' }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.48;
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  return <polygon className={className} points={points} fill="#ffd93b" stroke="#e09a12" strokeWidth="2.5" strokeLinejoin="round" />;
}

/** Cúp vàng có cành nguyệt quế + ruy băng đỏ hai đuôi gấp nếp, chữ tiêu đề nằm trên ruy băng. */
export function TitleBanner({ title, id }) {
  return <header className="lb-title">
    <svg className="lb-title-trophy" viewBox="0 0 220 120" aria-hidden="true">
      <defs>
        <radialGradient id="lb-glow" cx="50%" cy="55%" r="50%"><stop offset="0" stopColor="#fff7b0" stopOpacity=".95" /><stop offset=".6" stopColor="#ffe066" stopOpacity=".35" /><stop offset="1" stopColor="#ffe066" stopOpacity="0" /></radialGradient>
        <linearGradient id="lb-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff07a" /><stop offset=".55" stopColor="#ffc928" /><stop offset="1" stopColor="#f2a516" /></linearGradient>
      </defs>
      <ellipse className="lb-trophy-glow" cx="110" cy="66" rx="92" ry="56" fill="url(#lb-glow)" />
      <g className="lb-laurel lb-laurel-left" fill="url(#lb-gold)" stroke={INK} strokeWidth="2">
        <path d="M78 104C56 98 44 82 42 60" fill="none" stroke="#e0a21e" strokeWidth="4" strokeLinecap="round" />
        {[[50, 96, -35], [44, 82, -55], [41, 68, -75], [42, 54, -95], [62, 104, -15]].map(([cx, cy, rot]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="11" ry="6" transform={`rotate(${rot} ${cx} ${cy})`} />)}
      </g>
      <g className="lb-laurel lb-laurel-right" fill="url(#lb-gold)" stroke={INK} strokeWidth="2">
        <path d="M142 104c22-6 34-22 36-44" fill="none" stroke="#e0a21e" strokeWidth="4" strokeLinecap="round" />
        {[[170, 96, 35], [176, 82, 55], [179, 68, 75], [178, 54, 95], [158, 104, 15]].map(([cx, cy, rot]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="11" ry="6" transform={`rotate(${rot} ${cx} ${cy})`} />)}
      </g>
      <path d="M84 26H70c0 18 8 28 20 30M136 26h14c0 18-8 28-20 30" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M84 26H70c0 18 8 28 20 30M136 26h14c0 18-8 28-20 30" fill="none" stroke="#ffd23f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M80 18h60v20c0 20-14 34-30 34S80 58 80 38Z" fill="url(#lb-gold)" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M102 72h16v12h-16z" fill="#ffc928" stroke={INK} strokeWidth="3" />
      <rect x="88" y="84" width="44" height="14" rx="4" fill="url(#lb-gold)" stroke={INK} strokeWidth="3" />
      <Star5 x={110} y={40} r={12} />
      <path d="M88 24v18" stroke="#fffbe0" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <Star4 className="lb-twinkle lb-tw-a" /><Star4 className="lb-twinkle lb-tw-b" /><Star4 className="lb-twinkle lb-tw-c" />

    <div className="lb-ribbon">
      <svg className="lb-ribbon-art" viewBox="0 0 640 128" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="lb-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6a55" /><stop offset=".55" stopColor="#e5362f" /><stop offset="1" stopColor="#c62521" /></linearGradient>
          <linearGradient id="lb-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <clipPath id="lb-band-clip"><path d="M70 24Q320 0 570 24L578 96Q320 72 62 96Z" /></clipPath>
        </defs>
        <path d="M6 54h92v62H6l24-31Z" fill="#c42420" stroke="#8f1513" strokeWidth="4" strokeLinejoin="round" />
        <path d="M634 54h-92v62h92l-24-31Z" fill="#c42420" stroke="#8f1513" strokeWidth="4" strokeLinejoin="round" />
        <path d="M62 96l36 20V90Z" fill="#8f1513" />
        <path d="M578 96l-36 20V90Z" fill="#8f1513" />
        <path d="M70 24Q320 0 570 24L578 96Q320 72 62 96Z" fill="url(#lb-red)" stroke="#9c1c19" strokeWidth="4" strokeLinejoin="round" />
        <path d="M80 34Q320 12 560 34" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
        <path d="M74 86Q320 62 566 86" fill="none" stroke="#fff3c4" strokeOpacity=".55" strokeWidth="2.5" strokeDasharray="10 8" />
        <g clipPath="url(#lb-band-clip)"><rect className="lb-ribbon-shine" x="-140" y="0" width="120" height="128" fill="url(#lb-shine)" /></g>
        <Star5 x={92} y={62} r={16} className="lb-ribbon-star" />
        <Star5 x={548} y={62} r={16} className="lb-ribbon-star lb-ribbon-star-b" />
      </svg>
      <h1 id={id}>{title}</h1>
    </div>
  </header>;
}

/** Cúp phát sáng trên đế tím ở đầu thẻ. */
export function GlowTrophy() {
  return <span className="lb-glow-trophy" aria-hidden="true">
    <span className="lb-glow-rays" />
    <svg viewBox="0 0 120 130">
      <defs>
        <linearGradient id="lb-gold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff38a" /><stop offset=".55" stopColor="#ffcb2e" /><stop offset="1" stopColor="#f0a313" /></linearGradient>
        <linearGradient id="lb-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a07be8" /><stop offset="1" stopColor="#6c43c2" /></linearGradient>
      </defs>
      <path d="M30 22H14c0 22 10 34 26 36M90 22h16c0 22-10 34-26 36" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M30 22H14c0 22 10 34 26 36M90 22h16c0 22-10 34-26 36" fill="none" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 12h68v26c0 24-16 40-34 40S26 62 26 38Z" fill="url(#lb-gold2)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M52 78h16v16H52z" fill="#ffc928" stroke={INK} strokeWidth="3.5" />
      <path d="M40 94h40v6H40z" fill="#ffd23f" stroke={INK} strokeWidth="3" />
      <rect x="28" y="100" width="64" height="24" rx="6" fill="url(#lb-purple)" stroke="#4a2a8c" strokeWidth="4" />
      <rect x="48" y="107" width="24" height="9" rx="2" fill="#ffd23f" stroke={INK} strokeWidth="2" />
      <Star5 x={60} y={40} r={14} />
      <path d="M36 20v22" stroke="#fffbe0" strokeWidth="5" strokeLinecap="round" />
    </svg>
    <Star4 className="lb-twinkle lb-tw-d" /><Star4 className="lb-twinkle lb-tw-e" />
  </span>;
}

const MEDAL_TONES = {
  1: { coin: ['#fff07a', '#ffc928', '#e89c12'], rim: '#c78310' },
  2: { coin: ['#ffffff', '#d7e0ea', '#a9b7c8'], rim: '#7f8fa5' },
  3: { coin: ['#ffd6a8', '#ef9f58', '#c9733a'], rim: '#9a5426' },
  0: { coin: ['#fff5d6', '#ffe08a', '#f2c14e'], rim: '#c9922c' }
};

/** Huy chương dây xanh; hạng 1–3 có ngôi sao, từ hạng 4 hiện số hạng. */
export function Medal({ rank }) {
  const tier = rank >= 1 && rank <= 3 ? rank : 0;
  const tone = MEDAL_TONES[tier];
  const gid = `lb-coin-${tier}`;
  return <svg className="lb-medal" viewBox="0 0 64 76" aria-hidden="true">
    <defs><radialGradient id={gid} cx="38%" cy="32%" r="70%"><stop offset="0" stopColor={tone.coin[0]} /><stop offset=".55" stopColor={tone.coin[1]} /><stop offset="1" stopColor={tone.coin[2]} /></radialGradient></defs>
    <path d="M14 2h14l10 26H24Z" fill="#3d8ee6" stroke="#1f5fae" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M50 2H36L26 28h14Z" fill="#5aa8f5" stroke="#1f5fae" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M20 2l9 24" stroke="#bfe1ff" strokeWidth="2" />
    <circle cx="32" cy="48" r="24" fill={`url(#${gid})`} stroke={tone.rim} strokeWidth="3.5" />
    <circle cx="32" cy="48" r="17" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
    {tier
      ? <Star5 x={32} y={49} r={11} />
      : <text x="32" y="57" textAnchor="middle" fontFamily="Baloo 2, Quicksand, sans-serif" fontWeight="800" fontSize={rank >= 100 ? 16 : rank >= 10 ? 20 : 24} fill="#8a5a12">{rank}</text>}
    <path d="M18 40a16 16 0 0 1 10-10" stroke="#fff" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>;
}

/** Các ngôi sao 4 cánh nhấp nháy quanh viền khung. */
export function FrameSparkles() {
  return <span className="lb-frame-sparkles" aria-hidden="true">
    {Array.from({ length: 10 }, (_, i) => <Star4 key={i} className={`lb-spark lb-spark-${i}`} />)}
  </span>;
}

/** Tia sáng hai bên hàng được làm nổi bật. */
export function SparkRays() {
  return <span className="lb-rays" aria-hidden="true">
    <span className="lb-rays-side lb-rays-left"><i /><i /><i /></span>
    <span className="lb-rays-side lb-rays-right"><i /><i /><i /></span>
  </span>;
}
