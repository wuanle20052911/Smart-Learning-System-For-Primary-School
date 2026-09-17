import React, { useState } from 'react';

export default function LessonView({ lesson, onBack, onComplete, AssignedWorkView, AIQuizGenerator, api }) {
  if (lesson.isAssignment) return <AssignedWorkView assignment={lesson} onBack={onBack} api={api} />;
  const content = lesson.content?.trim();
  const [showGenerator, setShowGenerator] = useState(false);
  if (showGenerator) return <AIQuizGenerator lesson={lesson} onBack={() => setShowGenerator(false)} api={api} />;
  return <section className={`home-panel lesson-inline ${lesson.color || 'blue'}`}>
    <div className="panel-heading">
      <div><h2>{lesson.title}</h2><p>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</p></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button>
    </div>
    <article className="lesson-detail">
      <div className="lesson-detail-heading"><span className="lesson-detail-icon">{lesson.icon || '📚'}</span><div><small>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</small><h1>{lesson.title}</h1><p>{lesson.description || 'Cùng khám phá bài học này nhé!'}</p></div></div>
      <div className="lesson-content"><h2>Nội dung bài học</h2>{lesson.source_filename && <p className="lesson-material">📎 Tài liệu: <b>{lesson.source_filename}</b></p>}{content ? <div className="lesson-content-text">{content}</div> : <p>Bài học này chưa có tài liệu chi tiết. Hãy xem hướng dẫn của giáo viên để bắt đầu nhé.</p>}</div>
      <div className="lesson-actions">
        <button className="lesson-action-button lesson-ai" type="button" onClick={() => setShowGenerator(true)}><img src="/public/img/star.png" alt="" />TẠO BÀI TẬP TỪ AI</button>
        <button className="lesson-action-button lesson-start" type="button" onClick={onComplete}><img src="/public/img/medal.png" alt="" />ĐÃ HỌC XONG BÀI NÀY ✓</button>
      </div>
    </article>
  </section>;
}
