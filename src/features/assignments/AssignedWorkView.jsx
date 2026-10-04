import React, { useState } from 'react';

export default function AssignedWorkView({ assignment, onBack, onStudyActivity, api }) {
  const isPractice = assignment.isPractice === true;
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(isPractice ? null : assignment.submission || null);
  const [error, setError] = useState('');
  const questions = assignment.questions || [];
  const answerIsMissing = (question, answer) => answer === undefined || answer === null || answer === ''
    || (question.type === 'matching' && (!Array.isArray(answer) || answer.some((value) => value === '')));
  const isCorrect = (question, answer) => question.type === 'matching'
    ? JSON.stringify(answer) === JSON.stringify(question.answer)
    : question.type === 'multiple-choice' || question.type === 'true-false'
      ? Number(answer) === Number(question.answer)
      : String(answer ?? '').trim().toLocaleLowerCase('vi-VN') === String(question.answer ?? '').trim().toLocaleLowerCase('vi-VN');
  const displayAnswer = (question, answer) => {
    if (question.type === 'matching') {
      return Array.isArray(answer)
        ? question.options.map((pair, index) => `${pair.left} → ${answer[index] === '' || answer[index] == null ? 'Chưa chọn' : question.options[answer[index]]?.right ?? 'Chưa chọn'}`).join('; ')
        : 'Chưa trả lời';
    }
    return Array.isArray(question.options) ? question.options[answer] || 'Chưa trả lời' : answer || 'Chưa trả lời';
  };
  const submit = async () => {
    if (questions.some((question, index) => answerIsMissing(question, answers[index]))) {
      setError('Con hãy trả lời tất cả câu hỏi trước khi nộp bài nhé.');
      return;
    }
    if (isPractice) {
      const correctCount = questions.reduce((count, question, index) => count + (isCorrect(question, answers[index]) ? 1 : 0), 0);
      setResult({
        practice: true,
        correct_count: correctCount,
        total_questions: questions.length,
        score: Math.round((correctCount / questions.length) * 100),
        answers: questions.map((_, index) => answers[index])
      });
      onStudyActivity?.();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/submissions', { method: 'POST', body: JSON.stringify({ assignment_id: assignment.id, answers: questions.map((_, index) => answers[index]) }) });
      setResult(data);
      onStudyActivity?.();
    } catch (submitError) {
      setError(submitError.message || 'Không thể nộp bài tập.');
    } finally {
      setBusy(false);
    }
  };
  if (result) return <section className="ai-card assignment-result"><div className="ai-result">✅</div><h2>{isPractice ? 'Con đã hoàn thành lượt luyện tập!' : 'Con đã hoàn thành bài tập'}</h2><strong className="ai-score">{result.correct_count ?? result.correctCount}/{result.total_questions ?? result.totalQuestions}</strong><p>Điểm: {result.score}/100{result.submitted_at ? ` · Nộp lúc ${new Date(result.submitted_at).toLocaleString('vi-VN')}` : ''}</p><div className="assignment-review"><h3>📖 Xem lại bài làm</h3>{questions.map((question, index) => { const answer = result.answers?.[index]; const correct = isCorrect(question, answer); return <article className={correct ? 'correct' : 'wrong'} key={question.id || index}><strong>Câu {index + 1}: {correct ? '✓ Đúng' : '✗ Chưa đúng'}</strong><p>{question.question}</p><small>Con trả lời: <b>{displayAnswer(question, answer)}</b></small><small>Đáp án đúng: <b>{displayAnswer(question, question.answer)}</b></small>{question.explanation && <small>Giải thích: {question.explanation}</small>}</article>; })}</div>{isPractice && <button className="submit" type="button" onClick={() => { setAnswers({}); setResult(null); setError(''); }}>Luyện tập lại</button>}<button className="ai-link" type="button" onClick={onBack}>{isPractice ? '← Về bài học' : '← Về danh sách bài tập'}</button></section>;
  return <section className="ai-card assigned-quiz"><div className="ai-card-head"><div><span className="ai-kicker">{isPractice ? 'LUYỆN TẬP TỪ NGÂN HÀNG CÂU HỎI' : 'BÀI TẬP CÔ GIAO'}</span><h2>{assignment.title}</h2></div><button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button></div><p className="assigned-quiz-meta">{questions.length} câu hỏi{isPractice && assignment.lessonTitle ? ` · ${assignment.lessonTitle}` : !isPractice ? ` · ${assignment.difficulty === 'hard' ? 'Khó' : assignment.difficulty === 'medium' ? 'Vừa' : 'Dễ'}` : ''}</p>{questions.map((question, index) => <article className="assigned-question" key={question.id || index}><span className="ai-question-number">Câu {index + 1}</span><h3>{question.question}</h3>{question.type === 'matching' ? <div className="ai-options">{question.options.map((pair, pairIndex) => <label className="ai-option matching-answer" key={`${pair.left}-${pairIndex}`}><span>{pair.left}</span><select value={answers[index]?.[pairIndex] ?? ''} onChange={(event) => { const nextAnswers = [...(answers[index] || Array(question.options.length).fill(''))]; nextAnswers[pairIndex] = event.target.value === '' ? '' : Number(event.target.value); setAnswers((previous) => ({ ...previous, [index]: nextAnswers })); }}><option value="">Chọn vế phải</option>{question.options.map((choice, choiceIndex) => <option value={choiceIndex} key={choiceIndex}>{choice.right}</option>)}</select></label>)}</div> : Array.isArray(question.options) && question.options.length ? <div className="ai-options">{question.options.map((option, optionIndex) => <button className={`ai-option ${answers[index] === optionIndex ? 'selected' : ''}`} type="button" key={`${option}-${optionIndex}`} onClick={() => setAnswers((previous) => ({ ...previous, [index]: optionIndex }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div> : <input className="ai-answer-input" value={answers[index] || ''} onChange={(event) => setAnswers((previous) => ({ ...previous, [index]: event.target.value }))} placeholder="Nhập câu trả lời của con..." />}</article>)}{error && <p className="ai-error">{error}</p>}<button className="submit" type="button" onClick={submit} disabled={busy}>{busy ? '⏳ Đang nộp bài...' : isPractice ? 'Xem kết quả luyện tập' : 'Nộp bài tập'}</button></section>;
}
