import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './styles.css';

GlobalWorkerOptions.workerSrc = pdfWorker;

const sessionKey = 'learnhub-session';
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; }
};
const authHeaders = (json = false) => {
  const session = readSession();
  return { Authorization: `Bearer ${session?.access_token || ''}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
};
const go = (path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };
const logout = () => { localStorage.removeItem(sessionKey); go('/'); };
const api = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Đã xảy ra lỗi.');
  return data;
};

function Brand({ href = '/' }) { return <a className="brand" href={href} onClick={(e) => { e.preventDefault(); go(href); }}><span className="brand-mark">✦</span><span><strong className="brand-name">MathJoy</strong><small className="brand-subtitle">HỌC TOÁN THẬT VUI</small></span></a>; }

function AuthPage() {
  const [mode, setMode] = useState('login'); const [role, setRole] = useState('student'); const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '' }); const [message, setMessage] = useState({ text: '', type: '' }); const [busy, setBusy] = useState(false);
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true); setMessage({ text: '', type: '' });
    try { const data = await api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify({ ...form, role }) });
      if (data.session) localStorage.setItem(sessionKey, JSON.stringify({ ...data.session, user: data.user, profile: data.profile }));
      setMessage({ text: data.message || 'Đăng nhập thành công.', type: 'success' });
      if (mode === 'login') setTimeout(() => go(data.profile?.role === 'admin' ? '/admin' : data.profile?.role === 'teacher' ? '/teacher' : '/learn'), 400);
    } catch (error) { setMessage({ text: error.message, type: 'error' }); } finally { setBusy(false); }
  };
  return <main className="auth-shell"><Brand /><a className="help-chip" href="#help">Trợ giúp học tập</a><div className="floating-chip lesson-chip">💡 Học vui hơn mỗi ngày!</div><div className="floating-chip badge-chip">🏆 Nhận 100+ huy hiệu</div><span className="shape shape-one">✦</span><span className="shape shape-two">━</span><span className="shape shape-three">%</span><span className="shape shape-four">÷</span><span className="shape shape-five">+</span><div className="corner-math corner-math-top-left">3 &lt; 5</div><div className="corner-math corner-math-top-right">6 x 4 = 24</div><div className="corner-math corner-math-bottom-left">8 : 2 = 4</div><div className="corner-math corner-math-bottom-right">7 &gt; 2</div><div className="study-math study-math-left">3 + __ = 7</div><div className="study-math study-math-right">2 x 1 = 2<br />2 x 2 = 4<br />2 x 3 = 6</div><span className="study-shape study-triangle" aria-hidden="true" /><span className="study-shape study-rectangle" aria-hidden="true" /><span className="study-shape study-square" aria-hidden="true" /><span className="study-shape study-circle" aria-hidden="true" /><div className="bush bush-left" aria-hidden="true"><i /><i /><i /><b /><b /></div><div className="bush bush-right" aria-hidden="true"><i /><i /><i /><b /><b /></div><div className="fence fence-left" aria-hidden="true"><i /><i /><i /></div><div className="fence fence-right" aria-hidden="true"><i /><i /><i /></div>
    <section className="welcome-banner"><h1>Chào mừng bạn nhỏ đến với MathJoy! 👋</h1><p>Cùng khám phá những điều thú vị trong thế giới Toán học nhé.</p></section>
    <section className="form-panel"><div className="login-art"><img src="/public/img/default.png" alt="" /></div><div className="form-wrap"><div className="heading"><h2>{mode === 'login' ? 'Đăng nhập cổng học tập' : 'Tạo tài khoản MathJoy'}</h2><p>Chọn đúng vai trò của mình để bắt đầu nhé</p></div>
      <p className="section-label">1. VAI TRÒ CỦA BẠN LÀ:</p><div className="role-picker">{[['student','/public/img/student.png','Học sinh'],['teacher','/public/img/teacher.png','Giáo viên'],['admin','/public/img/manager.png','Quản lý']].map(([value, image, label]) => <button type="button" className={`role-button ${role === value ? 'active' : ''}`} onClick={() => setRole(value)} key={value}><img className="role-icon" src={image} alt="" /><b>{label}</b></button>)}</div>
      <p className="section-label">2. NHẬP THÔNG TIN TÀI KHOẢN:</p><form onSubmit={submit}>{mode === 'register' && <div className="field"><label>Tên đầy đủ</label><input value={form.fullName} onChange={update('fullName')} required placeholder="Nguyễn Văn An" /></div>}<div className="field"><label>Email</label><input type="email" value={form.email} onChange={update('email')} required placeholder="email@example.com" /></div><div className="field"><label>Mật khẩu bí mật</label><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} required minLength="6" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)}>◉</button></div></div><button className="submit" disabled={busy}>{busy ? 'ĐANG XỬ LÝ...' : mode === 'login' ? 'ĐĂNG NHẬP NGAY 🚀' : 'ĐĂNG KÝ NGAY 🚀'}</button></form>
      <p className={`message ${message.type}`}>{message.text}</p><p className="switch-text">{mode === 'login' ? 'Chưa có tài khoản MathJoy?' : 'Đã có tài khoản MathJoy?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage({ text: '', type: '' }); }}>{mode === 'login' ? 'Đăng ký thành viên' : 'Đăng nhập'}</button></p></div></section><footer>© 2026 MathJoy Việt Nam. Phát triển bởi những người yêu Toán dành cho trẻ em Việt Nam.</footer></main>;
}

function Header({ title = 'MathJoy', children }) {
  const session = readSession();
  const avatarUrl = session?.profile?.avatar_url || '/public/img/avt/0ccb37e913a1419dc0063d7251243783.jpg';
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event) => {
      if (!event.target.closest('.profile-menu-wrap')) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
  const menuLink = (path) => (event) => {
    event.preventDefault();
    setMenuOpen(false);
    go(path);
  };
  return <header className="topbar"><Brand href="/learn" /><div className="top-actions">{children}<div className="profile-menu-wrap" onClick={(event) => event.stopPropagation()}><button className="header-avatar" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Mở menu tài khoản" aria-expanded={menuOpen}><img src={avatarUrl} alt="" /></button>{menuOpen && <div className="profile-dropdown"><a href="/profile" onClick={menuLink('/profile')}>👤 Thông tin cá nhân</a><a href="/history" onClick={menuLink('/history')}>📖 Lịch sử làm bài</a><button type="button" onClick={logout}>🚪 Đăng xuất</button></div>}</div></div></header>;
}

const quizTypes = [
  ['multiple-choice', '🔘', 'Trắc nghiệm', 'Chọn đáp án đúng'],
  ['true-false', '✅', 'Đúng / Sai', 'Bật mí sự thật'],
  ['fill-blank', '✏️', 'Điền chỗ trống', 'Điền từ còn thiếu'],
  ['matching', '🔗', 'Nối cặp', 'Ghép đôi thật nhanh'],
  ['short-answer', '💬', 'Trả lời ngắn', 'Viết câu trả lời']
];

function validQuizQuestion(question) {
  if (!question || typeof question.question !== 'string') return false;
  if (question.type === 'matching') return Array.isArray(question.pairs) && question.pairs.length > 0 && Array.isArray(question.correctMatches);
  if (question.type === 'fill-blank' || question.type === 'short-answer') return typeof question.answer === 'string' && question.answer.trim();
  return Array.isArray(question.options) && question.options.length >= 2 && Number.isInteger(question.correctIndex);
}

function AIQuizGenerator({ lesson, onBack }) {
  const [type, setType] = useState('multiple-choice');
  const [difficulty, setDifficulty] = useState('dễ');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = async () => {
    const content = lesson.content?.trim();
    if (!content) {
      setError('Bài học chưa có nội dung để AI tạo câu hỏi.');
      return;
    }
    setBusy(true);
    setError('');
    setQuestions([]);
    const schema = {
      'multiple-choice': '"type":"multiple-choice","options":["A","B","C","D"],"correctIndex":0',
      'true-false': '"type":"true-false","options":["Đúng","Sai"],"correctIndex":0',
      'fill-blank': '"type":"fill-blank","answer":"đáp án ngắn"',
      matching: '"type":"matching","pairs":[{"left":"vế trái","right":"vế phải"}],"correctMatches":[0]',
      'short-answer': '"type":"short-answer","answer":"ý trả lời đúng"'
    }[type];
    const systemPrompt = `Bạn là AI tạo bài tập Toán tiếng Việt cho học sinh tiểu học. Chỉ trả về JSON hợp lệ là một mảng. Mỗi câu có "question", "explanation" và đúng dạng ${type}: {${schema}}. Chỉ dùng thông tin trong tài liệu, đáp án phải chính xác.`;
    const userPrompt = `Tài liệu:\n"""${content.slice(0, 18000)}"""\nTạo ${count} câu hỏi. Độ khó: ${difficulty}. Dạng: ${type}. Chỉ trả về mảng JSON.`;
    try {
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({ systemPrompt, userPrompt }) });
      const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
      let parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
      if (!Array.isArray(parsed)) parsed = parsed.questions || [parsed];
      const valid = parsed.filter(validQuizQuestion).slice(0, count);
      if (!valid.length) throw new Error('AI chưa tạo được câu hỏi hợp lệ.');
      setQuestions(valid);
      setCurrent(0);
      setAnswers({});
      setFinished(false);
    } catch (generationError) {
      setError(generationError.message || 'Không thể tạo bài tập lúc này.');
    } finally {
      setBusy(false);
    }
  };
  const question = questions[current];
  const choose = (value) => setAnswers((previous) => ({ ...previous, [current]: value }));
  const isCorrect = (item, answer) => item.type === 'fill-blank' || item.type === 'short-answer'
    ? answer?.trim().toLowerCase() === item.answer?.trim().toLowerCase()
    : item.type === 'matching'
      ? JSON.stringify(answer) === JSON.stringify(item.correctMatches)
      : Number(answer) === item.correctIndex;
  const answerText = (item, answer) => {
    if (item.type === 'matching') return Array.isArray(answer) ? answer.map((value) => value === '' ? 'Chưa chọn' : item.pairs[value]?.right || '').join(', ') : '';
    if (item.type === 'fill-blank' || item.type === 'short-answer') return answer || '';
    return item.options?.[answer] || '';
  };
  const correctText = (item) => {
    if (item.type === 'matching') return item.correctMatches.map((value) => item.pairs[value]?.right || '').join(', ');
    if (item.type === 'fill-blank' || item.type === 'short-answer') return item.answer;
    return item.options?.[item.correctIndex] || '';
  };
  const saveAttempt = async () => {
    setSaving(true);
    const questionsForHistory = questions.map((item, index) => ({
      type: item.type || 'multiple-choice',
      question: item.question,
      options: item.options || [],
      pairs: item.pairs || [],
      correctIndex: item.correctIndex ?? null,
      answer: item.answer || null,
      correctMatches: item.correctMatches || [],
      explanation: item.explanation || 'Đáp án được xác định dựa trên nội dung bài học.',
      chosenAnswer: answerText(item, answers[index]),
      correctAnswer: correctText(item),
      isCorrect: isCorrect(item, answers[index])
    }));
    try {
      await api('/api/attempts', {
        method: 'POST',
        body: JSON.stringify({
          lesson_id: lesson.id || null,
          title: `Bài tập AI - ${lesson.title}`,
          grade: lesson.grade || 'Tiểu học',
          chapter: lesson.topic || 'Luyện tập AI',
          score,
          total: questions.length,
          questions: questionsForHistory,
          incorrect_answers: questionsForHistory.filter((item) => !item.isCorrect)
        })
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'Không thể lưu lịch sử bài làm.');
    } finally {
      setSaving(false);
    }
  };
  const next = () => {
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setFinished(true);
      saveAttempt();
    }
  };
  const score = questions.filter((item, index) => isCorrect(item, answers[index])).length;
  if (finished) return <section className="ai-card"><div className="ai-result">🎉</div><h2>Con đã hoàn thành!</h2><strong className="ai-score">{score}/{questions.length}</strong><p>{score === questions.length ? 'Tuyệt vời! Con làm đúng tất cả rồi!' : 'Cố gắng thêm một chút ở lần sau nhé!'}</p>{saving && <p className="ai-saving">⏳ Đang lưu kết quả...</p>}{saved && <p className="ai-saved">✓ Đã lưu vào lịch sử làm bài</p>}{error && <p className="ai-error">{error}</p>}<div className="ai-review"><h3>📖 Xem đáp án và giải thích</h3>{questions.map((item, index) => <article className={`ai-review-item ${isCorrect(item, answers[index]) ? 'correct' : 'wrong'}`} key={`${item.question}-${index}`}><strong>Câu {index + 1}: {isCorrect(item, answers[index]) ? '✓ Đúng' : '✗ Chưa đúng'}</strong><p>{item.question}</p><small>Đáp án: <b>{correctText(item)}</b></small><small>Giải thích: {item.explanation || 'Đáp án dựa trên nội dung bài học.'}</small></article>)}</div><button className="submit" type="button" onClick={() => { setFinished(false); setCurrent(0); setAnswers({}); setSaved(false); setError(''); }}>Làm lại</button><button className="ai-link" type="button" onClick={onBack}>← Về bài học</button></section>;
  if (question) return <section className="ai-card"><div className="ai-card-head"><div><span className="ai-kicker">BÀI TẬP AI ✨</span><h2>{lesson.title}</h2></div><span className="ai-counter">{current + 1}/{questions.length}</span></div><div className="ai-progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div><div className="ai-question"><span className="ai-question-number">Câu {current + 1}</span><h3>{question.question}</h3>{question.type === 'fill-blank' || question.type === 'short-answer' ? <input className="ai-answer-input" value={answers[current] || ''} onChange={(event) => choose(event.target.value)} placeholder="Nhập câu trả lời của con..." /> : question.type === 'matching' ? <div className="ai-options">{question.pairs.map((pair, index) => <label className="ai-option" key={`${pair.left}-${index}`}><span>{pair.left}</span><select value={answers[current]?.[index] ?? ''} onChange={(event) => { const nextAnswer = [...(answers[current] || Array(question.pairs.length).fill(''))]; nextAnswer[index] = Number(event.target.value); choose(nextAnswer); }}><option value="">Chọn vế phải</option>{question.pairs.map((choice, choiceIndex) => <option value={choiceIndex} key={choiceIndex}>{choice.right}</option>)}</select></label>)}</div> : <div className="ai-options">{question.options.map((option, index) => <button className={`ai-option ${answers[current] === index ? 'selected' : ''}`} type="button" key={option} onClick={() => choose(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}</div><button className="submit ai-next" type="button" disabled={answers[current] === undefined} onClick={next}>{current + 1 < questions.length ? 'Câu tiếp theo →' : 'Xem kết quả 🎉'}</button></section>;
  return <section className="ai-card"><div className="ai-hero">🪄</div><span className="ai-kicker">GÓC SÁNG TẠO AI</span><h2>Tạo bài tập thật vui!</h2><p>AI sẽ đọc nội dung bài học <strong>{lesson.title}</strong> và tạo câu hỏi vừa sức cho con.</p><div className="ai-field"><label>Dạng bài tập</label><div className="ai-type-grid">{quizTypes.map(([value, icon, label, hint]) => <button type="button" className={`ai-type ${type === value ? 'selected' : ''}`} onClick={() => setType(value)} key={value}><span>{icon}</span><b>{label}</b><small>{hint}</small></button>)}</div></div><div className="ai-settings"><label>Độ khó<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="dễ">Dễ</option><option value="vừa">Vừa</option><option value="khó">Khó</option></select></label><label>Số câu<select value={count} onChange={(event) => setCount(Number(event.target.value))}><option value="3">3 câu</option><option value="5">5 câu</option><option value="7">7 câu</option><option value="10">10 câu</option></select></label></div>{error && <p className="ai-error">{error}</p>}<button className="submit ai-generate" type="button" onClick={generate} disabled={busy}>{busy ? '⏳ AI đang soạn bài...' : '✨ Tạo bài tập ngay'}</button><button className="ai-link" type="button" onClick={onBack}>← Về nội dung bài học</button></section>;
}

function AssignedWorkView({ assignment, onBack }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(assignment.submission || null);
  const [error, setError] = useState('');
  const questions = assignment.questions || [];
  const submit = async () => {
    if (questions.some((_, index) => answers[index] === undefined || answers[index] === '')) {
      setError('Con hãy trả lời tất cả câu hỏi trước khi nộp bài nhé.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/submissions', { method: 'POST', body: JSON.stringify({ assignment_id: assignment.id, answers: questions.map((_, index) => answers[index]) }) });
      setResult(data);
    } catch (submitError) {
      setError(submitError.message || 'Không thể nộp bài tập.');
    } finally {
      setBusy(false);
    }
  };
  if (result) return <section className="ai-card assignment-result"><div className="ai-result">✅</div><h2>Con đã hoàn thành bài tập</h2><strong className="ai-score">{result.correct_count ?? result.correctCount}/{result.total_questions ?? result.totalQuestions}</strong><p>Điểm: {result.score}/100 · Nộp lúc {new Date(result.submitted_at).toLocaleString('vi-VN')}</p><div className="assignment-review"><h3>📖 Xem lại bài làm</h3>{questions.map((question, index) => { const answer = result.answers?.[index]; const correct = question.type === 'multiple-choice' || question.type === 'true-false' ? Number(answer) === Number(question.answer) : String(answer ?? '').trim().toLocaleLowerCase('vi-VN') === String(question.answer ?? '').trim().toLocaleLowerCase('vi-VN'); return <article className={correct ? 'correct' : 'wrong'} key={question.id || index}><strong>Câu {index + 1}: {correct ? '✓ Đúng' : '✗ Chưa đúng'}</strong><p>{question.question}</p><small>Con trả lời: <b>{Array.isArray(question.options) ? question.options[answer] || 'Chưa trả lời' : answer || 'Chưa trả lời'}</b></small><small>Đáp án đúng: <b>{Array.isArray(question.options) ? question.options[question.answer] : question.answer}</b></small>{question.explanation && <small>Giải thích: {question.explanation}</small>}</article>; })}</div><button className="ai-link" type="button" onClick={onBack}>← Về danh sách bài tập</button></section>;
  return <section className="ai-card assigned-quiz"><div className="ai-card-head"><div><span className="ai-kicker">BÀI TẬP CÔ GIAO</span><h2>{assignment.title}</h2></div><button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button></div><p className="assigned-quiz-meta">{questions.length} câu hỏi · {assignment.difficulty === 'hard' ? 'Khó' : assignment.difficulty === 'medium' ? 'Vừa' : 'Dễ'}</p>{questions.map((question, index) => <article className="assigned-question" key={question.id || index}><span className="ai-question-number">Câu {index + 1}</span><h3>{question.question}</h3>{Array.isArray(question.options) && question.options.length ? <div className="ai-options">{question.options.map((option, optionIndex) => <button className={`ai-option ${answers[index] === optionIndex ? 'selected' : ''}`} type="button" key={`${option}-${optionIndex}`} onClick={() => setAnswers((previous) => ({ ...previous, [index]: optionIndex }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div> : <input className="ai-answer-input" value={answers[index] || ''} onChange={(event) => setAnswers((previous) => ({ ...previous, [index]: event.target.value }))} placeholder="Nhập câu trả lời của con..." />}</article>)}{error && <p className="ai-error">{error}</p>}<button className="submit" type="button" onClick={submit} disabled={busy}>{busy ? '⏳ Đang nộp bài...' : 'Nộp bài tập'}</button></section>;
}

function LessonView({ lesson, onBack, onComplete }) {
  if (lesson.isAssignment) return <AssignedWorkView assignment={lesson} onBack={onBack} />;
  const content = lesson.content?.trim();
  const [showGenerator, setShowGenerator] = useState(false);
  if (showGenerator) return <AIQuizGenerator lesson={lesson} onBack={() => setShowGenerator(false)} />;
  return <section className={`home-panel lesson-inline ${lesson.color || 'blue'}`}>
    <div className="panel-heading">
      <div><h2>{lesson.title}</h2><p>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</p></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button>
    </div>
    <article className="lesson-detail">
      <div className="lesson-detail-heading"><span className="lesson-detail-icon">{lesson.icon || '📚'}</span><div><small>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</small><h1>{lesson.title}</h1><p>{lesson.description || 'Cùng khám phá bài học này nhé!'}</p></div></div>
      <div className="lesson-content"><h2>Nội dung bài học</h2>{lesson.source_filename && <p className="lesson-material">📎 Tài liệu: <b>{lesson.source_filename}</b></p>}{content ? <div className="lesson-content-text">{content}</div> : <p>Bài học này chưa có tài liệu chi tiết. Hãy xem hướng dẫn của giáo viên để bắt đầu nhé.</p>}</div>
      <div className="lesson-actions">
        <button className="submit lesson-ai" type="button" onClick={() => setShowGenerator(true)}>✨ TẠO BÀI TẬP TỪ AI</button>
        <button className="submit lesson-start" type="button" onClick={onComplete}>ĐÃ HỌC XONG BÀI NÀY ✓</button>
      </div>
    </article>
  </section>;
}

function LearnPage() {
  const [lessons, setLessons] = useState([]); const [assignments, setAssignments] = useState([]); const [error, setError] = useState(''); const [selectedLesson, setSelectedLesson] = useState(null);
  useEffect(() => { Promise.all([api('/api/lessons/published'), api('/api/assignments/published'), api('/api/submissions/mine')]).then(([l, a, s]) => { const submissions = s.submissions || []; setLessons(l.lessons || []); setAssignments((a.assignments || []).map((item) => ({ ...item, submission: submissions.find((submission) => submission.assignment_id === item.id) || null }))); }).catch((e) => setError(e.message)); }, []);
  const session = readSession(); const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('mathjoy-progress') || '{"xp":0,"lessons":0,"answered":0}'));
  const [completedLessons, setCompletedLessons] = useState(() => JSON.parse(localStorage.getItem('mathjoy-completed-lessons') || '[]'));
  const completeLesson = (lessonId) => {
    setProgress((value) => {
      const alreadyCompleted = completedLessons.includes(lessonId);
      const next = alreadyCompleted ? value : { ...value, lessons: value.lessons + 1, xp: value.xp + 10 };
      localStorage.setItem('mathjoy-progress', JSON.stringify(next));
      return next;
    });
    if (lessonId && !completedLessons.includes(lessonId)) {
      const nextCompleted = [...completedLessons, lessonId];
      setCompletedLessons(nextCompleted);
      localStorage.setItem('mathjoy-completed-lessons', JSON.stringify(nextCompleted));
    }
    setSelectedLesson(null);
  };
  const openAssignment = async (item) => {
    try {
      const data = await api(`/api/assignments/${item.id}`);
      setSelectedLesson({ ...data.assignment, submission: item.submission || null, isAssignment: true });
    } catch (openError) {
      setError(openError.message);
    }
  };
  return <><Header><button className="nav-chip">🔥 0 ngày</button>{session?.profile?.role === 'teacher' && <a className="nav-chip" href="/teacher" onClick={(e) => { e.preventDefault(); go('/teacher'); }}>Bảng giáo viên</a>}</Header><main className="home"><section className="welcome"><div><h1>Chào bạn nhỏ! 👋</h1><p>Cùng khám phá những điều thú vị trong thế giới Toán học nhé.</p></div><div className="mascot">🧮</div></section><section className="stats"><div className="stat"><span className="stat-icon">⭐</span><div><strong>{progress.xp}</strong><span>Điểm hôm nay</span></div></div><div className="stat"><span className="stat-icon">🏆</span><div><strong>{progress.lessons}</strong><span>Bài đã hoàn thành</span></div></div><div className="stat"><span className="stat-icon">🎯</span><div><strong>15 phút</strong><span>Mục tiêu mỗi ngày</span></div></div></section>{selectedLesson && <LessonView lesson={selectedLesson} onBack={() => setSelectedLesson(null)} onComplete={() => completeLesson(selectedLesson.id)} />}<div className="home-grid"><section className="home-panel"><div className="panel-heading"><div><h2>Tiếp tục học</h2><p>Chọn một bài để bắt đầu luyện tập</p></div><a href="#lessons">Xem tất cả</a></div>{error && <p className="message error">{error}</p>}<div className="lesson-grid">{lessons.length ? lessons.map((lesson) => <button className={`lesson ${lesson.color || 'blue'}`} key={lesson.id} onClick={() => setSelectedLesson(lesson)}><small>{lesson.subject}</small><h3>{lesson.title}</h3><p>{lesson.description}</p><span className="lesson-art">{lesson.icon || '📚'}</span>{completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}</button>) : <p className="lesson-empty">Chưa có bài học được xuất bản.</p>}</div></section><aside><section className="daily-card"><h2>Mục tiêu hôm nay</h2><p>Hoàn thành 5 câu hỏi để nhận thêm sao và giữ chuỗi học tập!</p><div className="daily-progress"><span style={{ width: `${Math.min(100, (progress.answered / 5) * 100)}%` }} /></div><small>{Math.min(5, progress.answered)}/5 câu hỏi</small></section><section className="assigned-work-card"><div className="assigned-work-heading"><div><span>📚</span><h2>Bài tập cần làm</h2></div><b>{assignments.length}</b></div><p className="assigned-work-subtitle">Bài tập cô giao cho em</p>{assignments.length ? <div className="assigned-work-list">{assignments.map((item) => <button className={`assigned-work-item ${item.submission ? 'is-done' : ''}`} key={item.id} onClick={() => openAssignment(item)}><span className="assigned-work-icon">{item.submission ? '✅' : '📝'}</span><span className="assigned-work-content"><strong>{item.title}</strong><small>{item.submission ? `Đã làm · ${item.submission.score}/100 · Bấm để xem lại` : `${item.question_count || 0} câu · ${item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Vừa' : 'Dễ'}`}</small></span><span className="assigned-work-arrow">›</span></button>)}</div> : <div className="assigned-work-empty">Hiện chưa có bài tập cô giao. 🎉</div>}</section></aside></div></main></>;
}

function AccountPage({ history = false }) {
  const session = readSession(); const [profile, setProfile] = useState(session?.profile || {}); const [studentClass, setStudentClass] = useState(null); const [avatars, setAvatars] = useState([]); const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar_url || ''); const [showAvatarPicker, setShowAvatarPicker] = useState(false); const [message, setMessage] = useState(''); const [attempts, setAttempts] = useState([]);
  useEffect(() => { if (!session?.access_token) return go('/'); Promise.all([api('/api/profile-avatars'), api('/api/auth/profile')]).then(([a, p]) => { setAvatars(a.avatars || []); setStudentClass(p.class); }).catch((e) => setMessage(e.message)); if (history) api('/api/attempts/mine').then((data) => setAttempts(data.attempts || [])).catch((e) => setMessage(e.message)); }, []);
  const save = async (e) => { e.preventDefault(); try { const data = await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName: profile.full_name, gender: profile.gender || '', birthDate: profile.birth_date || '', avatarUrl: selectedAvatar }) }); const next = { ...session, profile: data.profile }; localStorage.setItem(sessionKey, JSON.stringify(next)); setProfile(data.profile); setMessage('Đã lưu thông tin thành công.'); } catch (e) { setMessage(e.message); } };
  return <><Header /><main className="account-page"><a className="back-link" href="/learn" onClick={(e) => { e.preventDefault(); go('/learn'); }}>← Về trang học tập</a><h1>{history ? 'Lịch sử làm bài' : 'Thông tin cá nhân'}</h1>{history ? <section className="account-card history-list">{attempts.length ? attempts.map((item) => <details className="history-item" key={item.id}><summary><div><strong>{item.title}</strong><small>{item.grade} · {item.chapter} · {new Date(item.created_at).toLocaleDateString('vi-VN')}</small></div><b>{item.score}/{item.total}</b></summary>{Array.isArray(item.questions) && <div className="history-answers">{item.questions.map((question, index) => <article className={question.isCorrect ? 'correct' : 'incorrect'} key={`${item.id}-${index}`}><strong>Câu {index + 1}: {question.isCorrect ? '✓ Đúng' : '✗ Chưa đúng'}</strong><p>{question.question}</p><small>Đáp án: <b>{question.correctAnswer || question.answer || '—'}</b></small><small>Giải thích: {question.explanation || 'Chưa có giải thích.'}</small></article>)}</div>}</details>) : <p>Chưa có lần làm bài nào.</p>}</section> : <section className="account-card"><div className="profile-avatar-wrap"><button className="avatar-edit-trigger" type="button" onClick={() => setShowAvatarPicker((value) => !value)} aria-label="Chỉnh sửa avatar" aria-expanded={showAvatarPicker}><img className="profile-avatar-image" src={selectedAvatar || '/public/img/avt/0ccb37e913a1419dc0063d7251243783.jpg'} alt="Avatar" /><span className="avatar-edit-hint">Bạn muốn<br />chỉnh sửa avatar?</span></button></div>{showAvatarPicker && <div className="avatar-picker"><span>Chọn avatar:</span><div className="avatar-options">{avatars.map((avatar) => <button type="button" className={avatar === selectedAvatar ? 'active' : ''} onClick={() => setSelectedAvatar(avatar)} key={avatar} aria-label="Chọn avatar"><img src={avatar} alt="" /></button>)}</div></div>}<form className="profile-form" onSubmit={save}><label>Họ tên<input value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required /></label><label>Email<input value={profile.email || session?.user?.email || ''} readOnly /></label><label>Giới tính<select value={profile.gender || ''} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label><label>Ngày sinh<input type="date" value={profile.birth_date || ''} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} /></label><label>Lớp<input value={studentClass ? `${studentClass.name} (${studentClass.grade})` : 'Chưa được xếp lớp'} readOnly /></label><button className="save-profile">Lưu thông tin</button><p className="profile-message">{message}</p></form></section>}</main></>;
}

function AdminPage() {
  const [data, setData] = useState({ classes: [], teachers: [] }); const [message, setMessage] = useState('');
  const load = () => api('/api/catalog/management/options').then(setData).catch((e) => setMessage(e.message)); useEffect(load, []);
  const createClass = async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); try { await api('/api/catalog/classes', { method: 'POST', body: JSON.stringify({ name: form.get('name'), grade: form.get('grade'), teacher_id: form.get('teacher_id') || null }) }); e.currentTarget.reset(); setMessage('Đã tạo lớp.'); load(); } catch (e) { setMessage(e.message); } };
  const addMember = async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); try { await api('/api/catalog/classes/members', { method: 'POST', body: JSON.stringify({ class_id: form.get('class_id'), email: form.get('email') }) }); e.currentTarget.reset(); setMessage('Đã thêm học sinh vào lớp.'); } catch (e) { setMessage(e.message); } };
  return <main className="admin-shell"><header className="topbar"><div><Brand href="/admin" /><p>Cổng quản lý nhà trường</p></div><div className="actions"><a href="/learn" onClick={(e) => { e.preventDefault(); go('/learn'); }}>Trang học tập</a><button onClick={logout}>Đăng xuất</button></div></header><section className="intro"><span className="eyebrow">KHU VỰC QUẢN LÝ</span><h1>Quản lý lớp học</h1><p>Tạo lớp, chỉ định giáo viên và thêm học sinh.</p></section><p className="message">{message}</p><div className="grid"><section className="card"><h2>+ Tạo lớp học</h2><form onSubmit={createClass}><label>Tên lớp<input name="name" required /></label><label>Khối<input name="grade" required /></label><label>Giáo viên<select name="teacher_id"><option value="">Chưa chỉ định</option>{data.teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.full_name} · {teacher.email}</option>)}</select></label><button className="primary">Tạo lớp</button></form></section><section className="card"><h2>+ Thêm học sinh</h2><form onSubmit={addMember}><label>Lớp học<select name="class_id" required><option value="">Chọn lớp học</option>{data.classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></label><label>Email học sinh<input name="email" type="email" required /></label><button className="primary">Thêm vào lớp</button></form></section></div><section className="card class-list-card"><div className="heading"><h2>Danh sách lớp</h2><span>{data.classes.length} lớp</span></div>{data.classes.map((item) => <article className="class-row" key={item.id}><div><strong>{item.name} · {item.grade}</strong><small>Giáo viên: {item.assigned_teacher_name || 'Chưa chỉ định'}</small></div><small>{new Date(item.created_at).toLocaleDateString('vi-VN')}</small></article>)}</section></main>;
}

function AssignmentStudio({ onMessage }) {
  const sampleQuestions = [
    { type: 'multiple-choice', question: 'Phân số nào bé hơn 1?', options: ['5/3', '3/5', '7/4', '9/2'], answer: 1, explanation: 'Tử số nhỏ hơn mẫu số nên 3/5 bé hơn 1.' },
    { type: 'multiple-choice', question: 'Kết quả của 2/5 + 1/5 là gì?', options: ['1/5', '2/5', '3/5', '4/5'], answer: 2, explanation: 'Cộng hai tử số và giữ nguyên mẫu số: 2/5 + 1/5 = 3/5.' },
    { type: 'true-false', question: 'Mọi phân số có tử số nhỏ hơn mẫu số đều bé hơn 1.', options: ['Đúng', 'Sai'], answer: 0, explanation: 'Đây là tính chất cơ bản của phân số.' }
  ];
  const [material, setMaterial] = useState('Phân số là cách biểu diễn một phần của tổng thể. Tử số cho biết số phần được lấy, mẫu số cho biết tổng số phần bằng nhau.');
  const [materialName, setMaterialName] = useState('');
  const [title, setTitle] = useState('Ôn tập Phân số - Phiếu 1');
  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  useEffect(() => { api('/api/catalog/classes').then((data) => setClasses(data.classes || [])).catch((error) => onMessage(`Không thể tải danh sách lớp: ${error.message}`)); }, []);
  const updateQuestion = (index, key, value) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateOption = (qIndex, optionIndex, value) => setQuestions((items) => items.map((item, index) => index === qIndex ? { ...item, options: item.options.map((option, current) => current === optionIndex ? value : option) } : item));
  const generate = async () => {
    if (!material.trim()) { onMessage('Hãy nhập nội dung hoặc đưa tài liệu trước khi tạo câu hỏi.'); return; }
    setBusy(true);
    try {
      const systemPrompt = 'Bạn là giáo viên tiểu học. Chỉ trả về JSON array. Mỗi câu gồm type, question, options, correctIndex là số nguyên chỉ đáp án đúng bắt đầu từ 0, explanation. Dùng type multiple-choice hoặc true-false.';
      const payload = await api('/api/generate-quiz', { method: 'POST', body: JSON.stringify({ systemPrompt, userPrompt: `Tài liệu:\n${material.slice(0, 18000)}\nTạo 5 câu hỏi trắc nghiệm tiếng Việt, chính xác, phù hợp học sinh tiểu học.` }) });
      const text = (payload.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('').trim();
      const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
      const generated = (Array.isArray(parsed) ? parsed : parsed.questions || []).map((item) => ({ ...item, answer: Number.isInteger(item.answer) ? item.answer : Number(item.correctIndex) || 0 })).filter((item) => item.question && Array.isArray(item.options));
      if (!generated.length) throw new Error('AI không trả về câu hỏi hợp lệ.');
      setQuestions(generated);
      onMessage('AI đã tạo câu hỏi. Hãy kiểm tra và chỉnh sửa trước khi xuất bản.');
    } catch (error) {
      onMessage(`AI local chưa tạo được câu hỏi: ${error.message || 'Lỗi không xác định.'} Bạn có thể dùng nút "Dùng dữ liệu mẫu" để thử giao diện.`);
    } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!questions.length) { onMessage('Hãy tạo câu hỏi trước khi xuất bản.'); return; }
    if (!title.trim()) { onMessage('Hãy nhập tên bài tập trước khi xuất bản.'); return; }
    if (!classId) { onMessage('Hãy chọn lớp được giao bài tập trước khi xuất bản.'); return; }
    setBusy(true);
    try {
      await api('/api/assignments', { method: 'POST', body: JSON.stringify({ title, description: 'Bài tập được giáo viên kiểm tra từ tài liệu.', difficulty: 'medium', published: true, class_id: classId || null, questions: questions.map((item) => ({ type: item.type || 'multiple-choice', question: item.question, options: item.options || [], answer: item.answer, explanation: item.explanation || '', points: 1 })) }) });
      setPublished(true); onMessage('Đã xuất bản bài tập cho cả lớp.');
    } catch (error) { onMessage(`Không thể xuất bản bài tập: ${error.message}`); }
    finally { setBusy(false); }
  };
  const readFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    let text = '';
    try {
      if (['txt', 'md'].includes(extension)) {
        text = await file.text();
      } else if (extension === 'docx') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (extension === 'pdf') {
        const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 40); pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => item.str).join(' '));
        }
        text = pages.join('\n');
      } else {
        event.target.value = ''; setMaterialName(''); onMessage('Chỉ hỗ trợ file .pdf, .docx, .txt hoặc .md.'); return;
      }
    } catch (error) {
      event.target.value = ''; setMaterialName(''); onMessage(`Không đọc được tài liệu: ${error.message}`); return;
    }
    if (!text.trim()) { onMessage('File không có nội dung văn bản để AI đọc.'); return; }
    setMaterial(text.slice(0, 18000)); setMaterialName(file.name); onMessage(`Đã đọc tài liệu ${file.name}.`);
  };
  return <section className="assignment-studio"><div className="studio-intro"><div><span className="panel-kicker">TẠO BÀI TẬP CÙNG AI LOCAL</span><h2>Từ tài liệu đến bài tập cho cả lớp</h2><p>Đang sử dụng Ollama trên máy local, không gửi tài liệu ra dịch vụ bên ngoài.</p></div><span className="studio-steps">1 Tài liệu　→　2 AI local　→　3 Kiểm tra　→　4 Xuất bản</span></div><div className="studio-grid"><section className="teacher-card studio-source"><h3>1. Thêm tài liệu</h3><label className="material-upload"><span>📄</span><b>{materialName || 'Chọn tài liệu PDF hoặc Word'}</b><small>Hỗ trợ .pdf, .docx, .txt, .md</small><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={readFile} /></label><textarea value={material} onChange={(event) => setMaterial(event.target.value)} rows="9" placeholder="Hoặc dán nội dung bài học tại đây..." /><button className="teacher-create" onClick={generate} disabled={busy}>{busy ? 'AI local đang tạo...' : '✦ Tạo câu hỏi bằng AI local'}</button><button className="secondary-studio sample-button" type="button" onClick={() => { setQuestions(sampleQuestions); onMessage('Đã nạp dữ liệu mẫu.'); }}>Dùng dữ liệu mẫu</button></section><section className="teacher-card studio-review"><div className="studio-review-head"><div><h3>2. Kiểm tra và chỉnh sửa</h3><small>{questions.length ? `${questions.length} câu hỏi đã tạo` : 'Chưa có câu hỏi'}</small></div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên bài tập" /><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp được giao</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></div>{questions.length ? questions.map((item, index) => <article className="editable-question" key={index}><div className="editable-question-head"><b>Câu {index + 1}</b><button type="button" onClick={() => setQuestions((items) => items.filter((_, current) => current !== index))}>Xóa</button></div><textarea value={item.question} onChange={(event) => updateQuestion(index, 'question', event.target.value)} rows="2" />{(item.options || []).map((option, optionIndex) => <label key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} /><input className="answer-radio" type="radio" checked={item.answer === optionIndex} onChange={() => updateQuestion(index, 'answer', optionIndex)} /></label>)}<input value={item.explanation || ''} onChange={(event) => updateQuestion(index, 'explanation', event.target.value)} placeholder="Giải thích đáp án (không bắt buộc)" /></article>) : <div className="studio-empty">Câu hỏi AI tạo ra sẽ xuất hiện ở đây để giáo viên kiểm tra.</div>}<div className="studio-actions"><button className="secondary-studio" type="button" onClick={() => setQuestions((items) => [...items, { ...sampleQuestions[0], question: 'Câu hỏi mới của giáo viên?' }])}>+ Thêm câu hỏi</button><button className="teacher-create" type="button" onClick={publish} disabled={busy || published}>{published ? '✓ Đã xuất bản' : 'Xuất bản cho cả lớp'}</button></div></section></div></section>;
}

function TeacherPage() {
  const [activeView, setActiveView] = useState('overview');
  const [message, setMessage] = useState('');
  const [lessons, setLessons] = useState([]);
  const students = [['Trần Minh Khang', 'Phân số', '4.8/10', 'Cao'], ['Lê Bảo Ngọc', 'Phân số, Hình học', '5.2/10', 'Cao'], ['Nguyễn Hải Nam', 'Phép nhân, chia', '5.6/10', 'Trung bình'], ['Phạm Gia Hân', 'Đo lường', '6.1/10', 'Trung bình']];
  const assignments = [['Luyện tập Phân số (P1)', 'Phân số', '72%', '21/29', 'blue'], ['Phép nhân số tự nhiên', 'Phép nhân, chia', '93%', '27/29', 'green'], ['Hình thoi và hình chữ nhật', 'Hình học', '86%', '25/29', 'yellow'], ['Ôn tập đo lường', 'Đo lường', '100%', '29/29', 'purple']];
  useEffect(() => { api('/api/lessons/mine').then((data) => setLessons(data.lessons || [])).catch(() => {}); }, []);
  const navItems = [['overview', '⌂', 'Tổng quan'], ['classes', '♧', 'Lớp học'], ['assignments', '▣', 'Bài tập'], ['students', '♙', 'Học sinh'], ['analytics', '▥', 'Phân tích học tập'], ['ai', '✦', 'Đề xuất AI']];
  const openAction = (text, view = 'assignments') => { setActiveView(view); setMessage(text); };
  return <main className="teacher-dashboard">
    <aside className="teacher-sidebar"><div className="teacher-logo">▰</div><div className="teacher-brand">MathJoy<small>Teacher</small></div><nav>{navItems.map(([value, icon, label]) => <button key={value} className={activeView === value ? 'active' : ''} onClick={() => setActiveView(value)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-help"><b>▣</b><strong>Mẹo hay cho giáo viên</strong><small>Đọc bài tập ngắn, đều đặn sẽ giúp học sinh tiến bộ hơn!</small><button onClick={() => setMessage('Khu vực hướng dẫn đang được chuẩn bị.')}>Xem thêm</button></div><button className="sidebar-bottom" onClick={() => setMessage('Cài đặt đang được chuẩn bị.')}>⚙ Cài đặt <span>›</span></button><button className="sidebar-bottom" onClick={() => setMessage('Trung tâm trợ giúp đang được chuẩn bị.')}>? Trợ giúp <span>›</span></button></aside>
    <section className="teacher-main"><header className="teacher-topbar"><div><h1>Dashboard giáo viên</h1><p>Tổng quan tình hình học tập của lớp</p></div><div className="teacher-filters"><select><option>Lớp 4A</option><option>Lớp 3A</option></select><select><option>Môn Toán</option><option>Môn Tiếng Việt</option></select><select><option>30 ngày</option><option>7 ngày</option></select>    <button className="teacher-create" onClick={() => setActiveView('assignments')}>＋ Tạo bài tập</button><button className="teacher-logout" onClick={logout}>↪</button></div></header>{message && <div className="teacher-toast">{message}<button onClick={() => setMessage('')}>×</button></div>}{activeView === 'overview' ? <><section className="teacher-metrics"><article><span className="metric-icon blue">★</span><div><small>Điểm trung bình lớp ⓘ</small><strong>7.8/10</strong><em>↑ 0.6 so với 30 ngày trước</em></div></article><article><span className="metric-icon green">✓</span><div><small>Tỷ lệ hoàn thành ⓘ</small><strong>86%</strong><em>↑ 8% so với 30 ngày trước</em></div></article><article><span className="metric-icon yellow">◎</span><div><small>Tỷ lệ chính xác ⓘ</small><strong>74%</strong><em className="down">↓ 3% so với 30 ngày trước</em></div></article><article><span className="metric-icon red">♟</span><div><small>Học sinh cần hỗ trợ ⓘ</small><strong>6</strong><em className="neutral">— không đổi</em></div></article></section><section className="teacher-chart-grid"><article className="teacher-card trend-card"><div className="card-heading"><div><small>XU HƯỚNG ĐIỂM TRUNG BÌNH THEO TUẦN ⓘ</small><h2>Tiến bộ của lớp</h2></div><span>7.8</span></div><div className="line-chart"><svg viewBox="0 0 500 170" role="img" aria-label="Biểu đồ điểm trung bình"><path d="M30 130 L135 112 L240 94 L345 78 L465 48 L465 150 L30 150 Z" fill="#e9f5ff" /><path d="M30 130 L135 112 L240 94 L345 78 L465 48" fill="none" stroke="#46a9ea" strokeWidth="4" />{[[30,130,'6.4'],[135,112,'6.8'],[240,94,'7.1'],[345,78,'7.4'],[465,48,'7.8']].map(([x,y,value]) => <g key={x}><circle cx={x} cy={y} r="5" fill="#46a9ea" /><text x={x - 10} y={y - 12}>{value}</text></g>)}</svg><div className="chart-labels"><span>Tuần 1</span><span>Tuần 2</span><span>Tuần 3</span><span>Tuần 4</span><span>Tuần 5</span></div></div></article><article className="teacher-card skill-card"><div className="card-heading"><div><small>MỨC ĐỘ THÀNH THẠO KỸ NĂNG ⓘ</small><h2>Kỹ năng của lớp</h2></div></div>{[['Số tự nhiên','85%','green'],['Phép cộng, trừ','80%','green'],['Phép nhân, chia','68%','yellow'],['Hình học','65%','blue'],['Đo lường','60%','blue'],['Phân số','42%','red']].map(([label, value, color]) => <div className="skill-row" key={label}><span>{label}</span><i><b className={color} style={{width:value}} /></i><strong>{value}</strong></div>)}</article><article className="teacher-card donut-card"><div className="card-heading"><div><small>TỶ LỆ NỘP BÀI ⓘ</small><h2>Đúng hạn</h2></div></div><div className="donut"><strong>86%</strong><small>Đã nộp bài</small></div><p><span className="dot green" /> Đã nộp: 86% (25 học sinh)</p><p><span className="dot gray" /> Chưa nộp: 14% (4 học sinh)</p></article><article className="teacher-card ai-suggestion"><span className="ai-badge">✦ AI</span><h3>Đề xuất từ AI</h3><p>Dựa trên kết quả học tập 30 ngày, bạn có thể:</p><b>▣ Ôn tập chủ đề Phân số</b><small>Kỹ năng này đang đáng để ôn tập cho lớp (42% thành thạo).</small><ul><li>Giao bài tập ôn Phân số</li><li>Sử dụng bài tập tương tác</li><li>Kiểm tra lại sau 7 ngày</li></ul><button onClick={() => openAction('Đã chọn tạo bài tập ôn tập Phân số.')}>Tạo bài tập ôn tập　›</button></article></section><section className="teacher-bottom-grid"><article className="teacher-card assignment-table-card"><div className="card-heading"><div><small>BÀI TẬP ĐANG GIAO</small><h2>Hoạt động gần đây</h2></div><button onClick={() => setActiveView('assignments')}>Xem tất cả bài tập　›</button></div><table><thead><tr><th>Tên bài tập</th><th>Chủ đề</th><th>Giao ngày</th><th>Hạn nộp</th><th>Tỷ lệ hoàn thành</th><th>Đã nộp</th></tr></thead><tbody>{assignments.map(([name, topic, progress, submitted, color]) => <tr key={name}><td><span className={`table-file ${color}`}>▣</span>{name}</td><td>{topic}</td><td>20/05/2025</td><td>27/05/2025</td><td>    <b className="mini-progress"><i className={color} style={{width:progress}} />{progress}</b></td><td>{submitted}　⋮</td></tr>)}</tbody></table></article><article className="teacher-card support-card"><div className="card-heading"><div><small>HỌC SINH CẦN HỖ TRỢ</small><h2>Ưu tiên theo dõi</h2></div><button onClick={() => setActiveView('students')}>Xem tất cả</button></div>{students.map(([name, topics, score, risk]) => <div className="support-row" key={name}><span className="student-face">●</span><div><b>{name}</b><small>Yếu: {topics}</small></div><strong>{score}</strong><em className={risk === 'Cao' ? 'high' : 'medium'}>{risk}</em></div>)}</article>    </section></> : activeView === 'assignments' ? <AssignmentStudio onMessage={setMessage} /> : <section className="teacher-placeholder teacher-card"><span>✦</span><h2>{navItems.find(([value]) => value === activeView)?.[2]}</h2><p>Khu vực này đang dùng dữ liệu mẫu để bạn xem trước giao diện. Các thao tác sẽ được kết nối API ở bước tiếp theo.</p><button className="teacher-create" onClick={() => setActiveView('overview')}>Về tổng quan</button></section>}</section>
  </main>;
}

function AccessDenied({ destination }) {
  useEffect(() => {
    const timer = window.setTimeout(() => go(destination), 900);
    return () => window.clearTimeout(timer);
  }, [destination]);
  return <main className="access-denied"><div className="access-denied-card"><div className="access-denied-icon">🔒</div><h1>Bạn không có quyền truy cập</h1><p>Trang này chỉ dành cho tài khoản có quyền phù hợp.</p><small>Đang chuyển bạn về khu vực được phép...</small></div></main>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  useEffect(() => {
    const styles = path === '/' || path === '/auth'
      ? ['/public/css/auth.css']
      : path === '/admin'
        ? ['/public/css/admin.css']
        : path === '/teacher'
          ? ['/public/css/teacher.css']
          : path === '/profile' || path === '/history'
            ? ['/public/css/quiz-generator.css', '/public/css/account.css']
            : ['/public/css/quiz-generator.css'];
    document.querySelectorAll('link[data-page-style]').forEach((link) => link.remove());
    styles.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.pageStyle = 'true';
      document.head.appendChild(link);
    });
  }, [path]);
  const session = readSession();
  const isPublicPath = path === '/' || path === '/auth';
  useEffect(() => {
    if (!session?.access_token && !isPublicPath) go('/');
  }, [isPublicPath, session?.access_token]);
  if (isPublicPath || !session?.access_token) return <AuthPage />;
  const role = session.profile?.role;
  if (path === '/admin') {
    if (role !== 'admin') return <AccessDenied destination={role === 'teacher' ? '/teacher' : '/learn'} />;
    return <AdminPage />;
  }
  if (path === '/teacher') {
    if (!['teacher', 'admin'].includes(role)) return <AccessDenied destination="/learn" />;
    return <TeacherPage />;
  }
  if (path === '/profile') return <AccountPage />;
  if (path === '/history') return <AccountPage history />;
  return <LearnPage />;
}

createRoot(document.getElementById('root')).render(<App />);
