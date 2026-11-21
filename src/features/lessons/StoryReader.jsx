import React, { useEffect, useRef } from 'react';

function isTypingTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export default function StoryReader({ slides, index, visited, onSelect }) {
  const stripRef = useRef(null);
  const thumbRefs = useRef([]);
  const touchStart = useRef(null);
  const total = slides.length;
  const slide = slides[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const go = (next) => {
    if (next >= 0 && next < total && next !== index) onSelect(next);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (slides[index + 1]?.url) new Image().src = slides[index + 1].url;
    const strip = stripRef.current;
    const thumb = thumbRefs.current[index];
    if (strip && thumb) {
      strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: 'smooth' });
    }
  }, [index, slides]);

  const onTouchStart = (event) => { touchStart.current = event.touches[0].clientX; };
  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  if (!slide) return null;
  return <div className="story-reader">
    <div className="story-reader-top">
      <div className="story-reader-steps" aria-hidden="true">
        {slides.map((item, i) => <i key={`${item.path}-${i}`} className={i === index ? 'current' : visited.has(i) ? 'seen' : ''} />)}
      </div>
      <span className="story-reader-counter" aria-live="polite">Tranh {index + 1} / {total}</span>
    </div>

    <div className="story-reader-stage">
      <button className="story-reader-nav prev" type="button" onClick={() => go(index - 1)} disabled={isFirst} aria-label="Tranh trước">‹</button>
      <div className="story-reader-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img key={slide.url} src={slide.url} alt={slide.caption || `Tranh ${index + 1} của câu chuyện`} />
      </div>
      <button className="story-reader-nav next" type="button" onClick={() => go(index + 1)} disabled={isLast} aria-label="Tranh tiếp">›</button>
    </div>

    {slide.caption && <p className="story-reader-caption">{slide.caption}</p>}

    {total > 1 && <nav className="story-reader-thumbs" ref={stripRef} aria-label="Chọn tranh">
      {slides.map((item, i) => <button
        key={`${item.path}-${i}`}
        ref={(element) => { thumbRefs.current[i] = element; }}
        type="button"
        className={visited.has(i) ? 'seen' : ''}
        aria-current={i === index ? 'step' : undefined}
        aria-label={`Xem tranh ${i + 1}${item.caption ? `: ${item.caption}` : ''}`}
        onClick={() => go(i)}
      ><img src={item.url} alt="" loading="lazy" /><span>{i + 1}</span></button>)}
    </nav>}
    {total > 1 && <p className="story-reader-hint">Bấm ‹ › hoặc vuốt sang trái/phải để lật trang.</p>}
  </div>;
}
