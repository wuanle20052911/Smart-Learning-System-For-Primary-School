import React from 'react';

// Hình minh hoạ nhỏ cho từng mẫu trò chơi (vẽ riêng cho MathJoy).
const C = { red: '#e5484d', green: '#2f9e6b', gold: '#f5b82e', blue: '#3b82c4', ink: '#1f3152', paper: '#ffffff', line: '#cfe0f2' };

function Tile({ x, y, w = 22, h = 16, fill = C.blue, label, dashed, r = 4 }) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={r} fill={dashed ? 'none' : fill} stroke={dashed ? C.blue : 'none'} strokeDasharray={dashed ? '3 2' : undefined} strokeWidth="1.5" />
    {label && <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill={dashed ? C.ink : C.paper} fontFamily="sans-serif">{label}</text>}
  </g>;
}

const art = {
  quiz: <>
    <rect x="22" y="14" width="76" height="72" rx="8" fill={C.paper} stroke={C.line} strokeWidth="2" />
    <rect x="32" y="24" width="44" height="6" rx="3" fill={C.line} />
    <text x="84" y="31" fontSize="13" fontWeight="900" fill={C.ink} fontFamily="sans-serif">?</text>
    <Tile x={32} y={40} w={26} h={18} fill={C.red} label="7" /><Tile x={62} y={40} w={26} h={18} fill={C.green} label="✓" />
    <Tile x={32} y={62} w={26} h={18} fill={C.red} label="9" /><Tile x={62} y={62} w={26} h={18} fill={C.red} label="6" />
  </>,
  'match-up': <>
    <Tile x={16} y={18} w={30} h={16} fill={C.blue} label="2×5" /><Tile x={16} y={42} w={30} h={16} fill={C.blue} label="3×4" /><Tile x={16} y={66} w={30} h={16} fill={C.blue} label="6×1" />
    <Tile x={54} y={18} w={24} h={16} dashed /><Tile x={54} y={42} w={24} h={16} dashed label="12" /><Tile x={54} y={66} w={24} h={16} dashed />
    <Tile x={86} y={30} w={22} h={16} fill={C.red} label="10" /><Tile x={86} y={58} w={22} h={16} fill={C.red} label="6" />
    <path d="M97 26 C 97 10, 70 8, 66 16" stroke={C.red} strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
  </>,
  'group-sort': <>
    <rect x="16" y="22" width="40" height="64" rx="7" fill="#e7f3ff" stroke={C.blue} strokeWidth="2" />
    <rect x="64" y="22" width="40" height="64" rx="7" fill="#fdeced" stroke={C.red} strokeWidth="2" />
    <text x="36" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill={C.blue} fontFamily="sans-serif">CHẴN</text>
    <text x="84" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill={C.red} fontFamily="sans-serif">LẺ</text>
    <Tile x={24} y={32} w={24} h={14} fill={C.blue} label="4" /><Tile x={24} y={52} w={24} h={14} fill={C.blue} label="18" />
    <Tile x={72} y={32} w={24} h={14} fill={C.red} label="7" /><Tile x={72} y={52} w={24} h={14} fill={C.red} label="31" />
  </>,
  ordering: <>
    <Tile x={10} y={40} w={22} h={20} fill={C.gold} label="12" /><Tile x={36} y={40} w={22} h={20} fill={C.gold} label="35" />
    <Tile x={62} y={40} w={22} h={20} fill={C.blue} label="48" /><Tile x={88} y={40} w={22} h={20} fill={C.gold} label="90" />
    <path d="M73 36 C 73 18, 46 18, 47 34" stroke={C.red} strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
    <text x="60" y="80" textAnchor="middle" fontSize="11" fontWeight="900" fill={C.ink} fontFamily="sans-serif">bé → lớn</text>
  </>,
  cloze: <>
    <rect x="18" y="38" width="84" height="44" rx="7" fill={C.paper} stroke={C.line} strokeWidth="2" />
    <text x="26" y="64" fontSize="11" fontWeight="800" fill={C.ink} fontFamily="sans-serif">1 tạ =</text>
    <Tile x={62} y={52} w={32} h={18} dashed />
    <Tile x={30} y={12} w={28} h={16} fill={C.green} label="100" /><Tile x={64} y={12} w={24} h={16} fill={C.red} label="10" />
    <path d="M44 30 C 44 50, 60 56, 66 58" stroke={C.blue} strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
  </>,
  'find-match': <>
    <rect x="10" y="10" width="100" height="40" rx="6" fill={C.paper} stroke={C.line} strokeWidth="2" strokeDasharray="4 3" />
    <text x="60" y="36" textAnchor="middle" fontSize="15" fontWeight="900" fill={C.red} fontFamily="sans-serif">7 × 8</text>
    <Tile x={14} y={62} w={26} h={22} fill={C.blue} label="54" /><Tile x={47} y={62} w={26} h={22} fill={C.green} label="56" /><Tile x={80} y={62} w={26} h={22} fill={C.blue} label="58" />
  </>,
  'open-box': <>
    <Tile x={26} y={22} w={30} h={26} fill={C.blue} label="1" /><Tile x={64} y={22} w={30} h={26} fill={C.red} label="★" />
    <Tile x={12} y={56} w={28} h={26} fill={C.blue} label="3" /><Tile x={46} y={56} w={28} h={26} fill={C.blue} label="4" /><Tile x={80} y={56} w={28} h={26} fill={C.blue} label="5" />
    <path d="M62 20 L56 12 M79 18 L79 8 M96 20 L102 12" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />
  </>,
  gameshow: <>
    <rect x="12" y="12" width="96" height="76" rx="8" fill={C.gold} />
    {Array.from({ length: 10 }, (_, index) => <circle key={`t${index}`} cx={18 + index * 9.5} cy="18" r="2" fill={C.paper} />)}
    {Array.from({ length: 10 }, (_, index) => <circle key={`b${index}`} cx={18 + index * 9.5} cy="82" r="2" fill={C.paper} />)}
    <rect x="22" y="26" width="76" height="48" rx="5" fill={C.paper} />
    <circle cx="90" cy="30" r="10" fill={C.paper} stroke={C.red} strokeWidth="2.5" /><path d="M90 24 L90 30 L95 32" stroke={C.red} strokeWidth="2" fill="none" />
    <Tile x={28} y={48} w={18} h={16} fill={C.red} label="✗" /><Tile x={50} y={48} w={18} h={16} fill={C.red} label="✗" /><Tile x={72} y={48} w={18} h={16} fill={C.green} label="✓" />
  </>,
  'digit-arrange': <>
    <rect x="10" y="28" width="100" height="30" rx="7" fill={C.paper} stroke={C.line} strokeWidth="2" />
    <Tile x={16} y={33} w={20} h={20} fill={C.red} label="7" /><Tile x={39} y={33} w={20} h={20} fill={C.blue} label="5" />
    <Tile x={62} y={33} w={20} h={20} dashed /><Tile x={85} y={33} w={20} h={20} dashed />
    <path d="M40 76 C 54 90, 80 88, 86 64" stroke={C.red} strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
    <Tile x={14} y={66} w={18} h={18} fill={C.gold} label="3" /><Tile x={36} y={66} w={18} h={18} fill={C.gold} label="0" />
  </>
};

export default function GameThumb({ type }) {
  return <svg className="gm-thumb" viewBox="0 0 120 100" aria-hidden="true">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.red} /></marker></defs>
    {art[type]}
  </svg>;
}
