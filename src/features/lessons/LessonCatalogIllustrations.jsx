import React from 'react';

export function ChapterHeadingIcon({ isChapterSelected }) {
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

export function LessonIllustration({ title, index }) {
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
