import React, { useEffect, useState } from 'react';

function answerLabel(question, answer) {
  if (answer === undefined || answer === null || answer === '') return 'Chưa trả lời';
  if (question.type === 'matching' && Array.isArray(answer)) {
    return question.options.map((pair, index) => `${pair.left} → ${question.options[answer[index]]?.right || 'Chưa chọn'}`).join('; ');
  }
  return Array.isArray(question.options) ? question.options[answer] || String(answer) : String(answer);
}

function isCorrect(question, answer) {
  if (question.type === 'matching') return JSON.stringify(answer) === JSON.stringify(question.answer);
  if (question.type === 'multiple-choice' || question.type === 'true-false') return Number(answer) === Number(question.answer);
  return String(answer ?? '').trim().toLocaleLowerCase('vi-VN') === String(question.answer ?? '').trim().toLocaleLowerCase('vi-VN');
}

export default function TeacherSubmissions({ api, onMessage }) {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/api/submissions/teacher')
    .then((data) => setSubmissions(data.submissions || []))
    .catch((error) => onMessage(`Không thể tải bài nộp: ${error.message}`));

  useEffect(() => { load(); }, []);

  const open = async (submission) => {
    try {
      const data = await api(`/api/submissions/teacher/${submission.id}`);
      setSelected(data.submission);
      setComment('');
    } catch (error) {
      onMessage(`Không thể mở bài nộp: ${error.message}`);
    }
  };

  const sendFeedback = async (event) => {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setBusy(true);
    try {
      const data = await api(`/api/submissions/teacher/${selected.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      setSelected((value) => ({ ...value, feedback: [data.feedback, ...(value.feedback || [])] }));
      setSubmissions((items) => items.map((item) => item.id === selected.id
        ? { ...item, feedback_count: (item.feedback_count || 0) + 1 }
        : item));
      setComment('');
      onMessage('Đã lưu nhận xét cho học sinh.');
    } catch (error) {
      onMessage(`Không thể lưu nhận xét: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (selected) return <section className="teacher-card submission-detail">
    <div className="card-heading">
      <div>
        <small>BÀI LÀM HỌC SINH</small>
        <h2>{selected.assignment.title}</h2>
        <p>{selected.student.full_name || selected.student.email} · Điểm {selected.score}/100</p>
      </div>
      <button className="secondary-studio" type="button" onClick={() => setSelected(null)}>← Danh sách bài nộp</button>
    </div>
    <div className="submission-questions">
      {selected.questions.map((question, index) => {
        const answer = selected.answers?.[index];
        const correct = isCorrect(question, answer);
        return <article className={`submission-question ${correct ? 'correct' : 'wrong'}`} key={question.id}>
          <span>Câu {index + 1} · {correct ? 'Đúng' : 'Chưa đúng'}</span>
          <h3>{question.question}</h3>
          <p>Học sinh trả lời: <b>{answerLabel(question, answer)}</b></p>
          <p>Đáp án đúng: <b>{answerLabel(question, question.answer)}</b></p>
          {question.explanation && <small>Giải thích: {question.explanation}</small>}
        </article>;
      })}
    </div>
    <div className="submission-feedback">
      <h3>Nhận xét của giáo viên</h3>
      {(selected.feedback || []).map((item) => <p className="feedback-item" key={item.id}>{item.comment}<small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></p>)}
      <form onSubmit={sendFeedback}>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="2000" rows="4" placeholder="Viết nhận xét, hướng dẫn hoặc động viên học sinh..." required />
        <button className="teacher-create" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu nhận xét'}</button>
      </form>
    </div>
  </section>;

  return <section className="teacher-card submissions-panel">
    <div className="card-heading"><div><small>THEO DÕI KẾT QUẢ</small><h2>Bài nộp của học sinh</h2><p>Chọn một bài để xem từng câu trả lời và nhận xét.</p></div><button className="submission-refresh" type="button" onClick={load}>↻ Làm mới</button></div>
    {submissions.length ? <div className="submission-list">{submissions.map((submission) => <button className="submission-row" type="button" key={submission.id} onClick={() => open(submission)}>
      <span><strong>{submission.student?.full_name || submission.student?.email || 'Học sinh'}</strong><small>{submission.assignment_title} · {new Date(submission.submitted_at).toLocaleString('vi-VN')}</small></span>
      <b>{submission.score}/100</b><i>{submission.correct_count}/{submission.total_questions} câu đúng</i><em className={submission.feedback_count ? 'review-status reviewed' : 'review-status'}>{submission.feedback_count ? '✓ Đã nhận xét' : 'Chưa nhận xét'}</em>
    </button>)}</div> : <p className="student-list-empty">Chưa có bài nộp nào.</p>}
  </section>;
}
