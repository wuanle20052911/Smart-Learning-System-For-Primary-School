import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MAX_LENGTH = 2000;
const POLL_MS = 15000;

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function timeLabel(value) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Người ở phía bên kia và dòng mô tả, tùy theo người đang xem là phụ huynh hay giáo viên
function describe(thread, viewerRole) {
  const classes = thread.classes.join(', ');
  return viewerRole === 'parent'
    ? { otherId: thread.teacher.id, name: `Cô/Thầy ${thread.teacher.full_name}`, sub: `${classes} · về ${thread.student.full_name}` }
    : { otherId: thread.parent.id, name: thread.parent.full_name, sub: `Phụ huynh của ${thread.student.full_name} · ${classes}` };
}

export default function MessageCenter({ api, viewerRole, onUnreadChange, emptyHint }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeKey, setActiveKey] = useState('');
  const [conversation, setConversation] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listEndRef = useRef(null);
  const activeKeyRef = useRef('');
  activeKeyRef.current = activeKey;

  const activeThread = threads.find((thread) => thread.key === activeKey) || null;

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api('/api/messages/threads');
      setThreads(data.threads || []);
      setError('');
    } catch (loadError) {
      if (!silent) setError(loadError.message || 'Không thể tải tin nhắn.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [api]);

  const loadConversation = useCallback(async (thread, silent = false) => {
    if (!thread) return;
    const { otherId } = describe(thread, viewerRole);
    if (!silent) { setConversationLoading(true); setConversationError(''); }
    try {
      const data = await api(`/api/messages/threads/${thread.student.id}/${otherId}`);
      if (activeKeyRef.current !== thread.key) return;
      setConversation(data);
      setThreads((current) => current.map((item) => (item.key === thread.key ? { ...item, unread: 0 } : item)));
    } catch (loadError) {
      if (!silent) setConversationError(loadError.message || 'Không thể tải cuộc trò chuyện.');
    } finally {
      if (!silent) setConversationLoading(false);
    }
  }, [api, viewerRole]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Kiểm tra tin mới định kỳ khi tab đang mở
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      loadThreads(true);
      const current = threads.find((thread) => thread.key === activeKeyRef.current);
      if (current) loadConversation(current, true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadThreads, loadConversation, threads]);

  useEffect(() => {
    onUnreadChange?.(threads.reduce((sum, thread) => sum + thread.unread, 0));
  }, [threads, onUnreadChange]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [conversation?.messages?.length, activeKey]);

  const openThread = (thread) => {
    setActiveKey(thread.key);
    setConversation(null);
    setDraft('');
    setSendError('');
    loadConversation(thread);
  };

  const send = async (event) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || !activeThread || sending) return;
    const { otherId } = describe(activeThread, viewerRole);
    setSending(true);
    setSendError('');
    try {
      const data = await api(`/api/messages/threads/${activeThread.student.id}/${otherId}`, {
        method: 'POST',
        body: JSON.stringify({ body })
      });
      setDraft('');
      setConversation((current) => (current && !current.messages.some((item) => item.id === data.message.id)
        ? { ...current, messages: [...current.messages, data.message] }
        : current));
      setThreads((current) => current
        .map((item) => (item.key === activeThread.key ? { ...item, last_message: { body: body.slice(0, 140), created_at: data.message.created_at, from_me: true } } : item))
        .sort((left, right) => new Date(right.last_message?.created_at || 0) - new Date(left.last_message?.created_at || 0)));
    } catch (sendFailure) {
      setSendError(sendFailure.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const onComposerKey = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    if (!needle) return threads;
    return threads.filter((thread) => [thread.student.full_name, thread.parent.full_name, thread.teacher.full_name, ...thread.classes]
      .some((text) => text.toLocaleLowerCase('vi').includes(needle)));
  }, [threads, query]);

  const grouped = useMemo(() => {
    const items = [];
    let lastDay = '';
    (conversation?.messages || []).forEach((message) => {
      const day = new Date(message.created_at).toDateString();
      if (day !== lastDay) { items.push({ type: 'day', key: `day-${day}`, label: dayLabel(message.created_at) }); lastDay = day; }
      items.push({ type: 'message', key: message.id, message });
    });
    return items;
  }, [conversation]);

  const lastMine = [...(conversation?.messages || [])].reverse().find((message) => message.from_me);

  if (loading) return <div className="msg-center msg-state">Đang tải tin nhắn...</div>;
  if (error) return <div className="msg-center msg-state msg-error" role="alert">{error}<button type="button" onClick={() => loadThreads()}>Thử lại</button></div>;
  if (!threads.length) {
    return <div className="msg-center msg-state">
      <span className="msg-empty-icon" aria-hidden="true">💬</span>
      <strong>Chưa có ai để nhắn tin</strong>
      <p>{emptyHint || (viewerRole === 'parent'
        ? 'Khi con được xếp vào lớp có giáo viên, bạn sẽ nhắn tin được với giáo viên của lớp đó tại đây.'
        : 'Khi học sinh trong lớp của bạn được liên kết với phụ huynh, cuộc trò chuyện sẽ hiện ở đây.')}</p>
    </div>;
  }

  const other = activeThread ? describe(activeThread, viewerRole) : null;
  return <div className="msg-wrap"><div className={`msg-center${activeThread ? ' has-active' : ''}`}>
    <aside className="msg-list" aria-label="Danh sách cuộc trò chuyện">
      {threads.length > 4 && <input className="msg-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={viewerRole === 'parent' ? 'Tìm giáo viên, tên con...' : 'Tìm phụ huynh, học sinh, lớp...'} aria-label="Tìm cuộc trò chuyện" />}
      <ul>
        {filtered.map((thread) => {
          const info = describe(thread, viewerRole);
          return <li key={thread.key}>
            <button type="button" className={`msg-thread${thread.key === activeKey ? ' active' : ''}${thread.unread ? ' unread' : ''}`} onClick={() => openThread(thread)} aria-current={thread.key === activeKey ? 'true' : undefined}>
              <span className={`msg-avatar ${viewerRole === 'parent' ? 'teacher' : 'parent'}`} aria-hidden="true">{initials(viewerRole === 'parent' ? thread.teacher.full_name : thread.parent.full_name)}</span>
              <span className="msg-thread-text">
                <span className="msg-thread-top"><b>{info.name}</b>{thread.last_message && <time>{timeLabel(thread.last_message.created_at)}</time>}</span>
                <small>{info.sub}</small>
                <span className="msg-preview">{thread.last_message ? `${thread.last_message.from_me ? 'Bạn: ' : ''}${thread.last_message.body}` : 'Chưa có tin nhắn — bắt đầu trò chuyện'}</span>
              </span>
              {thread.unread > 0 && <span className="msg-badge" aria-label={`${thread.unread} tin chưa đọc`}>{thread.unread}</span>}
            </button>
          </li>;
        })}
        {!filtered.length && <li className="msg-no-match">Không tìm thấy cuộc trò chuyện phù hợp.</li>}
      </ul>
    </aside>

    <section className="msg-conversation" aria-label="Cuộc trò chuyện">
      {!activeThread ? <div className="msg-placeholder"><span aria-hidden="true">✉️</span><p>Chọn một cuộc trò chuyện để xem tin nhắn.</p></div> : <>
        <header className="msg-head">
          <button type="button" className="msg-back" onClick={() => setActiveKey('')} aria-label="Quay lại danh sách">←</button>
          <span className={`msg-avatar ${viewerRole === 'parent' ? 'teacher' : 'parent'}`} aria-hidden="true">{initials(viewerRole === 'parent' ? activeThread.teacher.full_name : activeThread.parent.full_name)}</span>
          <div><b>{other.name}</b><small>{other.sub}</small></div>
        </header>
        <div className="msg-scroll" aria-live="polite">
          {conversationLoading ? <p className="msg-hint">Đang tải...</p>
            : conversationError ? <p className="msg-hint msg-error" role="alert">{conversationError}</p>
              : !grouped.length ? <p className="msg-hint">Hãy gửi lời chào đầu tiên 👋 Tin nhắn chỉ {viewerRole === 'parent' ? 'giáo viên này' : 'phụ huynh này'} và bạn xem được.</p>
                : <>
                  {conversation?.truncated && <p className="msg-hint">Đang hiện 200 tin nhắn gần nhất.</p>}
                  {grouped.map((item) => item.type === 'day'
                    ? <div className="msg-day" key={item.key}><span>{item.label}</span></div>
                    : <div className={`msg-bubble${item.message.from_me ? ' mine' : ''}`} key={item.key}>
                      <p>{item.message.body}</p>
                      <time>{new Date(item.message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{item.message.from_me && item.message.id === lastMine?.id && item.message.read_at ? ' · Đã xem' : ''}</time>
                    </div>)}
                </>}
          <span ref={listEndRef} />
        </div>
        <form className="msg-composer" onSubmit={send}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={onComposerKey}
            rows={Math.min(5, Math.max(1, draft.split('\n').length))}
            placeholder="Nhập tin nhắn..."
            title="Enter để gửi, Shift+Enter để xuống dòng"
            aria-label="Nội dung tin nhắn"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Đang gửi...' : 'Gửi'}</button>
          <div className="msg-composer-meta">
            {sendError ? <span className="msg-error" role="alert">{sendError}</span> : <span />}
            {draft.length > MAX_LENGTH - 200 && <span>{draft.length}/{MAX_LENGTH}</span>}
          </div>
        </form>
      </>}
    </section>
  </div></div>;
}
