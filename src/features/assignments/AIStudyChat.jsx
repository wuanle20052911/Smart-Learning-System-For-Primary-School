import React, { useState } from 'react';

const starterPrompts = ['Bài học này nói về nội dung gì?', 'Giải thích khái niệm quan trọng nhất.', 'Cho mình một ví dụ trong bài.'];

function readReply(payload) {
  if (typeof payload?.message === 'string') return payload;
  const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
  try {
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  } catch {
    return { message: text || 'Mình chưa tìm thấy câu trả lời trong tài liệu.' };
  }
}

export default function AIStudyChat({ api }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Chào con! Mình sẽ giúp con tìm hiểu nội dung trong tài liệu học tập. Nếu tài liệu chưa có câu trả lời, mình sẽ nói rõ nhé.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRetrievedChunks, setShowRetrievedChunks] = useState(false);

  const ask = async (question) => {
    const text = question.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setBusy(true);
    try {
      const payload = await api('/api/ai-chat', {
        method: 'POST',
        body: JSON.stringify({
          question: text,
          includeChunks: showRetrievedChunks
        })
      });
      const reply = readReply(payload);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: reply.message,
        sources: Array.isArray(reply.sources) ? reply.sources : [],
        chunks: Array.isArray(reply.chunks) ? reply.chunks : []
      }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error.message || 'Mình đang bận một chút, con thử lại nhé.' }]);
    } finally {
      setBusy(false);
    }
  };
  return <div className={`study-chat ${open ? 'is-open' : ''}`}>
    {open && <section className="study-chat-panel" aria-label="Trợ lý học tập AI">
      <header><div><span>✨</span><div><strong>Trợ lý MathJoy</strong><small>Chỉ trả lời theo tài liệu học tập</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng chat">×</button></header>
      <div className="study-chat-messages">{messages.map((message, index) => <div className={`study-chat-message ${message.role}`} key={`${message.role}-${index}`}><p>{message.text}</p>{message.sources?.length > 0 && <div className="study-chat-sources"><strong>Nguồn:</strong>{message.sources.map((source) => <details key={source.id}><summary>{source.label}</summary><p>{source.excerpt}</p></details>)}</div>}{showRetrievedChunks && message.chunks?.length > 0 && <details className="study-chat-retrieved"><summary>Các đoạn đã truy xuất ({message.chunks.length})</summary>{message.chunks.map((chunk) => <div className="study-chat-retrieved-chunk" key={chunk.id}><strong>{chunk.label}</strong><span>Độ tương đồng: {Number(chunk.similarity).toFixed(3)}</span><p>{chunk.excerpt}</p></div>)}</details>}</div>)}{busy && <div className="study-chat-message assistant"><p className="study-chat-typing">Đang tìm trong tài liệu...</p></div>}</div>
      <div className="study-chat-starters">{starterPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
      <button className="study-chat-debug-toggle" type="button" aria-pressed={showRetrievedChunks} onClick={() => setShowRetrievedChunks((value) => !value)}>{showRetrievedChunks ? 'Ẩn các đoạn truy xuất' : 'Xem các đoạn truy xuất'}</button>
      <form onSubmit={(event) => { event.preventDefault(); ask(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Hỏi trợ lý học tập..." aria-label="Tin nhắn" /><button type="submit" disabled={busy || !input.trim()} aria-label="Gửi tin nhắn">→</button></form>
    </section>}
    <button className="study-chat-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="study-chat-launcher-icon" aria-hidden="true">{open ? '×' : '🤖'}</span>
      <span className="study-chat-launcher-copy"><b>{open ? 'Đóng trợ lý' : 'Hỏi bài trong tài liệu'}</b><small>{open ? 'Hẹn gặp con nhé!' : 'Có trích dẫn nguồn'}</small></span>
      {!open && <svg className="study-chat-santa-hat" viewBox="0 0 72 62" aria-hidden="true">
        <path className="study-chat-santa-hat-cap" d="M12 40C16 22 30 8 47 9c13 1 18 13 16 31-13-8-26-7-38 3L12 40Z" />
        <path className="study-chat-santa-hat-brim" d="M8 39c15-7 37-5 53 2 6 3 6 10 0 12-16-8-36-8-52-1-7 1-8-9-1-13Z" />
        <circle className="study-chat-santa-hat-pom" cx="62" cy="44" r="7" />
      </svg>}
    </button>
  </div>;
}