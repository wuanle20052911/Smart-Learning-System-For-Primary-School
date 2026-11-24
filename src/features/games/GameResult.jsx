import React from 'react';
import { answerText, isAnswerCorrect } from './gameAnswers.js';
import './games.css';

export default function GameResult({ questions, answers, score, correct, total, submittedAt, feedback = [], children }) {
  const percent = Math.round(Number(score) || 0);
  const mood = percent >= 90 ? ['🏆', 'Xuất sắc!'] : percent >= 70 ? ['🌟', 'Làm tốt lắm!'] : percent >= 50 ? ['👍', 'Cố lên chút nữa!'] : ['💪', 'Mình ôn lại nhé!'];
  return <section className="gm-result">
    <div className="gm-result-hero">
      <span className="gm-result-emoji" aria-hidden="true">{mood[0]}</span>
      <h2>{mood[1]}</h2>
      <strong className="gm-result-score">{correct}/{total}</strong>
      <p>Điểm: {Number(score)}/100{submittedAt ? ` · Nộp lúc ${new Date(submittedAt).toLocaleString('vi-VN')}` : ''}</p>
    </div>
    {feedback.length > 0 && <section className="gm-feedback" aria-label="Nhận xét của giáo viên"><h3>💬 Nhận xét của cô</h3>{feedback.map((item) => <p key={item.id}>{item.comment}<small>{new Date(item.created_at).toLocaleString('vi-VN')}</small></p>)}</section>}
    <div className="gm-review">
      <h3>📖 Xem lại bài làm</h3>
      {questions.map((question, index) => {
        const answer = answers?.[index];
        const right = isAnswerCorrect(question, answer);
        return <article className={right ? 'is-right' : 'is-wrong'} key={question.id || index}>
          <strong>{index + 1}. {right ? '✓ Đúng' : '✗ Chưa đúng'}</strong>
          <p>{question.question.replaceAll('___', '_____')}</p>
          <small>Con trả lời: <b>{answerText(question, answer)}</b></small>
          {!right && <small>Đáp án đúng: <b>{answerText(question, question.answer)}</b></small>}
          {question.explanation && <small>Giải thích: {question.explanation}</small>}
        </article>;
      })}
    </div>
    {children}
  </section>;
}
