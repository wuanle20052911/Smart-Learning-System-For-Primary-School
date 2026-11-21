import React, { useEffect, useRef } from 'react';
import MessageCenter from './MessageCenter.jsx';

// Cửa sổ tin nhắn bật ra từ nút trên header. Đóng bằng ✕, phím Esc hoặc bấm ra ngoài.
export default function MessagePopup({ api, viewerRole, title, subtitle, onClose, onUnreadChange, returnFocusRef }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia('(max-width: 640px)').matches) document.body.style.overflow = 'hidden';
    const returnTarget = returnFocusRef?.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnTarget?.focus();
    };
  }, [onClose, returnFocusRef]);

  return <div className="msg-popup-backdrop" onClick={onClose}>
    <section className="msg-popup" role="dialog" aria-modal="true" aria-labelledby="msg-popup-title" onClick={(event) => event.stopPropagation()}>
      <header className="msg-popup-head">
        <div><h2 id="msg-popup-title">{title}</h2>{subtitle && <small>{subtitle}</small>}</div>
        <button ref={closeRef} type="button" className="msg-popup-close" onClick={onClose} aria-label="Đóng cửa sổ tin nhắn">✕</button>
      </header>
      <MessageCenter api={api} viewerRole={viewerRole} onUnreadChange={onUnreadChange} />
    </section>
  </div>;
}
