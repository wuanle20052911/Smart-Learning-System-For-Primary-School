import React, { useState } from 'react';

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

export default function AIQuizGenerator({ lesson, onBack, api }) {
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
    const systemPrompt = `Bạn là AI tạo bài tập Toán tiếng Việt cho học sinh tiểu học. Chỉ trả về JSON hợp lệ là một mảng. Mỗi câu có "question", "explanation" và đúng dạng ${type}: {${schema}}. Tạo câu hỏi luyện tập mới dựa trên kiến thức trong tài liệu, không sao chép nguyên văn câu hỏi hay ví dụ; đáp án phải chính xác.`;
    const userPrompt = `Dùng tài liệu sau làm nguồn kiến thức, không dùng nó như danh sách câu hỏi để chép lại:\n"""${content.slice(0, 18000)}"""\nTạo ${count} câu hỏi mới. Độ khó: ${difficulty}. Dạng: ${type}. Chỉ trả về mảng JSON.\nYêu cầu:\n- Kiểm tra cùng khái niệm/kỹ năng nhưng đặt câu hỏi và ví dụ khác tài liệu.\n- Với bài toán có số liệu, dùng số liệu mới, giữ dạng và độ khó tương đương, rồi tự kiểm tra phép tính và đáp án.\n- Với tình huống, đổi nhân vật/đồ vật/bối cảnh nhưng vẫn đánh giá đúng kiến thức đó.\n- Không hỏi lại nguyên văn định nghĩa/ví dụ, không thêm kiến thức ngoài tài liệu và chương trình tiểu học.\n- Các câu trong bộ phải đa dạng, không lặp tình huống hoặc mẫu số liệu.`;
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
