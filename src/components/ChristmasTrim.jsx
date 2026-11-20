import React from 'react';

const LAYOUTS = {
  sidebar: ['snow-cap', 'santa-hat'],
  card: ['snow-cap', 'holly holly-tl', 'gift gift-br'],
  request: ['snow-cap', 'holly holly-tr'],
  links: ['snow-cap', 'candy-cane candy-cane-tl', 'gingerbread gingerbread-br'],
};

export default function ChristmasTrim({ variant }) {
  const pieces = LAYOUTS[variant];
  if (!pieces) return null;
  return <span className={`xmas-trim xmas-${variant}`} aria-hidden="true">
    {pieces.map((piece) => <span key={piece} className={`xmas-piece xmas-${piece.split(' ').join(' xmas-')}`} />)}
  </span>;
}
