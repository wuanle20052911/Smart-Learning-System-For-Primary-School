import React, { useState } from 'react';

export default function AssignedWorkView({ assignment, onBack, api }) {
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
