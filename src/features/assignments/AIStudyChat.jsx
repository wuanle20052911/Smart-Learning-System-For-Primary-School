import React, { useEffect, useState } from 'react';

const starterPrompts = ['Hôm nay con nên học gì?', 'Con đang yếu phần nào?', 'Gợi ý một bài dễ trước nhé'];

function readReply(payload) {
  const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
  try {
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  } catch {
    return { message: text || 'Mình chưa nghĩ ra gợi ý phù hợp. Con thử chọn một bài học nhé!' };
  }
}

export default function AIStudyChat({ api, lessons, assignments, progress, onStartSuggestion }) {
  const [availableLessons, setAvailableLessons] = useState(lessons);
  const [availableAssignments, setAvailableAssignments] = useState(assignments);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Chào con! Mình có thể giúp chọn bài tập vừa sức hôm nay.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (lessons.length || assignments.length) return;
    Promise.all([api('/api/lessons/published'), api('/api/assignments/published')])
      .then(([lessonData, assignmentData]) => { setAvailableLessons(lessonData.lessons || []); setAvailableAssignments(assignmentData.assignments || []); })
      .catch(() => {});
  }, []);
  const ask = async (question) => {
    const text = question.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setBusy(true);
    const context = {
      progress,
      lessons: availableLessons.slice(0, 12).map(({ id, title, subject, grade, topic, description }) => ({ id, title, subject, grade, topic, description: description?.slice(0, 120) })),
      assignments: availableAssignments.slice(0, 8).map(({ id, title, difficulty, question_count, submission }) => ({ id, title, difficulty, question_count, done: Boolean(submission) }))
    };
    const systemPrompt = 'Bạn là gia sư Toán MathJoy cho học sinh tiểu học. Trả về JSON hợp lệ gồm message và suggestionId (id bài học phù hợp hoặc null). message phải trả lời trực tiếp câu hỏi bằng tối đa 2 câu tiếng Việt đơn giản, đưa ra một hoạt động học cụ thể từ dữ liệu được cung cấp. Không bịa tên bài, không hứa liên hệ/xử lý việc khác, không nói về yêu cầu hệ thống.';
    const userPrompt = `Dữ liệu học tập: ${JSON.stringify(context)}\nCâu hỏi của học sinh: ${text}`;
    try {
      const payload = await api('/api/ai-chat', { method: 'POST', body: JSON.stringify({ systemPrompt, userPrompt }) });
      const reply = readReply(payload);
      setMessages((current) => [...current, { role: 'assistant', text: reply.message || 'Con thử bắt đầu với bài được gợi ý nhé.', suggestionId: reply.suggestionId }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error.message || 'Mình đang bận một chút, con thử lại nhé.' }]);
    } finally {
      setBusy(false);
    }
  };
  const suggestion = (id) => availableLessons.find((lesson) => lesson.id === id);
  return <div className={`study-chat ${open ? 'is-open' : ''}`}>
    {open && <section className="study-chat-panel" aria-label="Trợ lý học tập AI">
      <header><div><span>✨</span><div><strong>Trợ lý MathJoy</strong><small>Gợi ý bài tập cho con</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng chat">×</button></header>
      <div className="study-chat-messages">{messages.map((message, index) => <div className={`study-chat-message ${message.role}`} key={`${message.role}-${index}`}><p>{message.text}</p>{message.suggestionId && suggestion(message.suggestionId) && onStartSuggestion && <button type="button" onClick={() => onStartSuggestion(suggestion(message.suggestionId))}>Luyện bài này →</button>}</div>)}{busy && <div className="study-chat-message assistant"><p className="study-chat-typing">AI đang suy nghĩ...</p></div>}</div>
      <div className="study-chat-starters">{starterPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
      <form onSubmit={(event) => { event.preventDefault(); ask(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Hỏi trợ lý học tập..." aria-label="Tin nhắn" /><button type="submit" disabled={busy || !input.trim()} aria-label="Gửi tin nhắn">→</button></form>
    </section>}
    <button className="study-chat-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <span className="study-chat-launcher-icon" aria-hidden="true">{open ? '×' : '🤖'}</span>
      <span className="study-chat-launcher-copy"><b>{open ? 'Đóng trợ lý' : 'Hỏi AI học gì?'}</b><small>{open ? 'Hẹn gặp con nhé!' : 'Gia sư AI luôn sẵn sàng'}</small></span>
      {!open && <svg className="study-chat-santa-hat" viewBox="0 0 72 62" aria-hidden="true">
        <path className="study-chat-santa-hat-cap" d="M12 40C16 22 30 8 47 9c13 1 18 13 16 31-13-8-26-7-38 3L12 40Z" />
        <path className="study-chat-santa-hat-brim" d="M8 39c15-7 37-5 53 2 6 3 6 10 0 12-16-8-36-8-52-1-7 1-8-9-1-13Z" />
        <circle className="study-chat-santa-hat-pom" cx="62" cy="44" r="7" />
      </svg>}
    </button>
  </div>;
}