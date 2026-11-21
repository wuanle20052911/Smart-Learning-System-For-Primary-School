import React from 'react';

const INK = '#6b3d1c';

function Face({ x = 16, y = 18, size = 1, blush = true }) {
  const eye = 1.25 * size;
  return <g>
    <circle cx={x - 3.2 * size} cy={y} r={eye} fill={INK} />
    <circle cx={x + 3.2 * size} cy={y} r={eye} fill={INK} />
    <path d={`M${x - 1.6 * size} ${y + 2.2 * size} q${1.6 * size} ${1.6 * size} ${3.2 * size} 0`} fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
    {blush && <>
      <ellipse cx={x - 5.6 * size} cy={y + 2 * size} rx={1.5 * size} ry={0.9 * size} fill="#ff8f8f" opacity=".65" />
      <ellipse cx={x + 5.6 * size} cy={y + 2 * size} rx={1.5 * size} ry={0.9 * size} fill="#ff8f8f" opacity=".65" />
    </>}
  </g>;
}

const stroke = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' };

const icons = {
  envelope: <>
    <rect x="4" y="8" width="24" height="17" rx="4" fill="#ffd772" {...stroke} />
    <path d="M5 10l11 8 11-8" fill="none" {...stroke} />
    <path d="M23 3.5c1.6-1.8 4.6-.4 3.9 2-.5 1.8-3.9 3.6-3.9 3.6s-3.4-1.8-3.9-3.6c-.7-2.4 2.3-3.8 3.9-2z" fill="#ff7b7b" {...stroke} strokeWidth="1.2" />
  </>,
  overview: <>
    <rect x="4" y="4" width="24" height="24" rx="6" fill="#dff1ff" {...stroke} />
    <rect x="8.5" y="16" width="4" height="8" rx="1.5" fill="#7cc5f2" {...stroke} strokeWidth="1.3" />
    <rect x="14" y="11" width="4" height="13" rx="1.5" fill="#ffc94d" {...stroke} strokeWidth="1.3" />
    <rect x="19.5" y="7.5" width="4" height="16.5" rx="1.5" fill="#7bd3a6" {...stroke} strokeWidth="1.3" />
  </>,
  heart: <>
    <path d="M16 27S4 19.6 4 11.6C4 7.4 7.2 4.5 10.8 4.5c2.3 0 4.1 1.2 5.2 3 1.1-1.8 2.9-3 5.2-3 3.6 0 6.8 2.9 6.8 7.1C28 19.6 16 27 16 27z" fill="#ff8a8a" {...stroke} />
    <Face y={14} size={0.9} />
  </>,
  target: <>
    <circle cx="15" cy="17" r="11" fill="#ff8a8a" {...stroke} />
    <circle cx="15" cy="17" r="7" fill="#fff6e8" {...stroke} strokeWidth="1.3" />
    <circle cx="15" cy="17" r="3" fill="#ff8a8a" {...stroke} strokeWidth="1.3" />
    <path d="M15 17L26.5 5.5" {...stroke} />
    <path d="M23.5 4.5l3 1-1 3M26.5 5.5l2-2" fill="none" {...stroke} strokeWidth="1.4" />
  </>,
  bulb: <>
    <path d="M16 3.5c5.5 0 9.5 4 9.5 9.2 0 3.4-1.8 5.4-3.4 7-.9.9-1.3 1.8-1.3 3H11.2c0-1.2-.4-2.1-1.3-3-1.6-1.6-3.4-3.6-3.4-7C6.5 7.5 10.5 3.5 16 3.5z" fill="#ffe066" {...stroke} />
    <rect x="11.5" y="23" width="9" height="5" rx="2" fill="#c9d6e3" {...stroke} strokeWidth="1.3" />
    <Face y={12.5} size={0.85} />
  </>,
  books: <>
    <rect x="4" y="6" width="7" height="21" rx="2" fill="#7cc5f2" {...stroke} />
    <rect x="11" y="9" width="7" height="18" rx="2" fill="#ffc94d" {...stroke} />
    <path d="M19.2 11.2l5.8-1.6 3.6 15.6-5.8 1.4z" fill="#7bd3a6" {...stroke} />
    <path d="M6 11h3M13 13.5h3" {...stroke} strokeWidth="1.2" />
  </>,
  pencil: <>
    <g transform="rotate(40 16 16)">
      <rect x="11" y="2" width="10" height="5" rx="2" fill="#ff9fb0" {...stroke} />
      <rect x="11" y="6.5" width="10" height="3" fill="#c9d6e3" {...stroke} strokeWidth="1.3" />
      <rect x="11" y="9.5" width="10" height="13" fill="#ffc94d" {...stroke} />
      <path d="M11 22.5L16 30l5-7.5z" fill="#ffe3b8" {...stroke} />
      <path d="M14.6 27.9L16 30l1.4-2.1z" fill={INK} />
    </g>
    <Face x={16} y={16} size={0.75} blush={false} />
  </>,
  openBook: <>
    <path d="M16 9c-3-2.6-7-3.2-12-2.4v18c5-.8 9-.2 12 2.4 3-2.6 7-3.2 12-2.4v-18C23 5.8 19 6.4 16 9z" fill="#fff6e8" {...stroke} />
    <path d="M16 9v18" {...stroke} />
    <path d="M7 11.5c2.4-.3 4.6 0 6.5 1M7 15.5c2.4-.3 4.6 0 6.5 1" fill="none" stroke="#e3a24f" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M23.5 10.3l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#ffc94d" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
  </>,
  refresh: <>
    <circle cx="16" cy="16" r="12" fill="#dff7ea" {...stroke} />
    <path d="M10.5 14.5a6 6 0 0 1 10.6-2.8M21.5 17.5a6 6 0 0 1-10.6 2.8" fill="none" {...stroke} strokeWidth="1.8" />
    <path d="M21.6 8.6v3.6H18M10.4 23.4v-3.6H14" fill="none" {...stroke} strokeWidth="1.8" />
  </>,
  profile: <>
    <circle cx="16" cy="16" r="12" fill="#e9e1ff" {...stroke} />
    <circle cx="16" cy="13" r="4.6" fill="#ffd9b8" {...stroke} strokeWidth="1.4" />
    <path d="M8.3 25c1.4-3.8 4.3-5.6 7.7-5.6s6.3 1.8 7.7 5.6" fill="#a98cf0" {...stroke} strokeWidth="1.4" />
    <circle cx="14.3" cy="13" r=".9" fill={INK} />
    <circle cx="17.7" cy="13" r=".9" fill={INK} />
  </>,
  backpack: <>
    <path d="M12 7V5.5a4 4 0 0 1 8 0V7" fill="none" {...stroke} />
    <rect x="6" y="7" width="20" height="21" rx="7" fill="#ff9f68" {...stroke} />
    <rect x="10" y="19" width="12" height="7" rx="3" fill="#ffd772" {...stroke} strokeWidth="1.3" />
    <Face y={13.5} size={0.85} />
  </>,
  family: <>
    <circle cx="11" cy="12" r="6" fill="#ffd9b8" {...stroke} />
    <circle cx="22" cy="15" r="4.5" fill="#ffd9b8" {...stroke} />
    <path d="M3.5 28c.6-5 3.6-8 7.5-8s6.9 3 7.5 8z" fill="#7cc5f2" {...stroke} />
    <path d="M15.5 28c.5-4 3-6.2 6.5-6.2s6 2.2 6.5 6.2z" fill="#ffc94d" {...stroke} />
    <Face x={11} y={12} size={0.65} />
    <Face x={22} y={15} size={0.5} blush={false} />
    <path d="M26.5 4.5c1.2-1.4 3.5-.3 3 1.5-.4 1.4-3 2.8-3 2.8s-2.6-1.4-3-2.8c-.5-1.8 1.8-2.9 3-1.5z" fill="#ff7b7b" {...stroke} strokeWidth="1" />
  </>,
  calendar: <>
    <rect x="4" y="6.5" width="24" height="21.5" rx="5" fill="#fff6e8" {...stroke} />
    <path d="M4 12.5h24V11a4.5 4.5 0 0 0-4.5-4.5h-15A4.5 4.5 0 0 0 4 11z" fill="#ff8a8a" {...stroke} />
    <path d="M10.5 4v5M21.5 4v5" {...stroke} strokeWidth="1.8" />
    <rect x="8" y="16" width="4" height="3.5" rx="1" fill="#7bd3a6" />
    <rect x="14" y="16" width="4" height="3.5" rx="1" fill="#7bd3a6" />
    <rect x="8" y="22" width="4" height="3.5" rx="1" fill="#c6ebd6" />
    <path d="M22.5 17.2l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" fill="#ffc94d" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
  </>,
  flame: <>
    <path d="M16 29c-6 0-9.5-4-9.5-9 0-4.8 3.4-7.6 5-11.5.4 2.6 1.8 4 3 4.5C15 8.5 17 5 20.5 3c-.6 3.8 1.2 6.3 2.8 8.4 1.4 1.9 2.2 4 2.2 7.6 0 5.8-3.8 10-9.5 10z" fill="#ff9f68" {...stroke} />
    <path d="M16 28c-3 0-4.8-2-4.8-4.6 0-2.6 2-4 3-6.2.8 1.8 2.2 2.4 3.2 2.2.4 1 .9 2 .9 3.6 0 3-1.4 5-2.3 5z" fill="#ffe066" />
    <Face y={20} size={0.75} />
  </>,
  chat: <>
    <path d="M5 7.5A4.5 4.5 0 0 1 9.5 3h9A4.5 4.5 0 0 1 23 7.5v5a4.5 4.5 0 0 1-4.5 4.5H12l-4.5 4v-4.2A4.5 4.5 0 0 1 5 12.5z" fill="#7cc5f2" {...stroke} />
    <path d="M14 14.5h8.5A4.5 4.5 0 0 1 27 19v3.5a4.5 4.5 0 0 1-3 4.25V30l-4-3h-1.5A4.5 4.5 0 0 1 14 22.5z" fill="#ffc94d" {...stroke} />
    <circle cx="10.5" cy="10" r="1.3" fill={INK} /><circle cx="14" cy="10" r="1.3" fill={INK} /><circle cx="17.5" cy="10" r="1.3" fill={INK} />
    <path d="M18 21.5q2.5 2 5 0" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
  </>,
  link: <>
    <g transform="rotate(-45 16 16)">
      <rect x="2" y="11" width="16" height="10" rx="5" fill="none" stroke={INK} strokeWidth="5.2" />
      <rect x="2" y="11" width="16" height="10" rx="5" fill="none" stroke="#7cc5f2" strokeWidth="2.6" />
      <rect x="14" y="11" width="16" height="10" rx="5" fill="none" stroke={INK} strokeWidth="5.2" />
      <rect x="14" y="11" width="16" height="10" rx="5" fill="none" stroke="#ffc94d" strokeWidth="2.6" />
      <path d="M14 13.6a5 5 0 0 1 0 4.8" fill="none" stroke={INK} strokeWidth="5.2" />
      <path d="M14 13.6a5 5 0 0 1 0 4.8" fill="none" stroke="#7cc5f2" strokeWidth="2.6" />
    </g>
    <path d="M24.5 4.2c1.1-1.3 3.2-.3 2.8 1.4-.4 1.3-2.8 2.6-2.8 2.6s-2.4-1.3-2.8-2.6c-.4-1.7 1.7-2.7 2.8-1.4z" fill="#ff7b7b" stroke={INK} strokeWidth="1" />
  </>,
  school: <>
    <path d="M4 14L16 5l12 9" fill="#ff8a8a" {...stroke} />
    <rect x="6.5" y="13" width="19" height="15" rx="2" fill="#fff6e8" {...stroke} />
    <rect x="13" y="20" width="6" height="8" rx="1.5" fill="#7cc5f2" {...stroke} strokeWidth="1.3" />
    <circle cx="16" cy="15.5" r="2.2" fill="#ffc94d" {...stroke} strokeWidth="1.2" />
  </>
};

export default function ParentIcon({ name, size = 22, className = '' }) {
  const shape = icons[name];
  if (!shape) return null;
  return <svg className={`parent-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">{shape}</svg>;
}
