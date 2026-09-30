import React, { useEffect, useState } from 'react';
import { renderDocxHtml } from '../../services/learningMaterials.js';

export default function LessonView({ lesson, onBack, onComplete, AssignedWorkView, AIQuizGenerator, api }) {
  if (lesson.isAssignment) return <AssignedWorkView assignment={lesson} onBack={onBack} api={api} />;
  const content = lesson.content?.trim();
  const [showGenerator, setShowGenerator] = useState(false);
  const [materialError, setMaterialError] = useState('');
  const [docxHtml, setDocxHtml] = useState('');
  const [docxLoading, setDocxLoading] = useState(false);
  const isDocx = /\.docx$/i.test(lesson.source_filename || lesson.source_path || '');
  useEffect(() => {
    if (!isDocx || !lesson.source_path) {
      setDocxHtml('');
      setDocxLoading(false);
      return undefined;
    }
    let active = true;
    setDocxHtml('');
    setDocxLoading(true);
    setMaterialError('');
    (async () => {
      try {
        const result = await api(`/api/lessons/${lesson.id}/material`);
        const response = await fetch(result.url);
        if (!response.ok) throw new Error('Không tải được tài liệu Word.');
        const html = await renderDocxHtml(await response.arrayBuffer());
        if (active) setDocxHtml(html);
      } catch (error) {
        if (active) setMaterialError(error.message || 'Không thể hiển thị tài liệu Word.');
      } finally {
        if (active) setDocxLoading(false);
      }
    })();
    return () => { active = false; };
  }, [api, isDocx, lesson.id, lesson.source_path]);
  const openMaterial = async () => {
    const materialWindow = window.open('about:blank', '_blank');
    try {
      const result = await api(`/api/lessons/${lesson.id}/material`);
      if (!materialWindow) throw new Error('Trình duyệt đang chặn cửa sổ mở tài liệu.');
      materialWindow.opener = null;
      materialWindow.location.href = result.url;
      setMaterialError('');
    } catch (error) {
      materialWindow?.close();
      setMaterialError(error.message || 'Không thể mở tài liệu.');
    }
  };
  if (showGenerator) return <AIQuizGenerator lesson={lesson} onBack={() => setShowGenerator(false)} api={api} />;
  return <section className={`home-panel lesson-inline ${lesson.color || 'blue'}`}>
    <div className="panel-heading">
      <div><h2>{lesson.title}</h2><p>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</p></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button>
    </div>
    <article className="lesson-detail">
      <div className="lesson-detail-heading"><span className="lesson-detail-icon">{lesson.icon || '📚'}</span><div><small>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</small><h1>{lesson.title}</h1><p>{lesson.description || 'Cùng khám phá bài học này nhé!'}</p></div></div>
      <div className="lesson-content"><h2>Nội dung bài học</h2>{lesson.source_filename && <p className="lesson-material">📎 Tài liệu: <b>{lesson.source_filename}</b>{lesson.source_path && <button className="lesson-material-open" type="button" onClick={openMaterial}>Mở tài liệu</button>}</p>}{docxLoading && <p className="lesson-material-status">Đang tải nội dung Word...</p>}{materialError && <p className="ai-error">{materialError}</p>}{docxHtml ? <div className="lesson-content-text lesson-docx-content" dangerouslySetInnerHTML={{ __html: docxHtml }} /> : content ? <div className="lesson-content-text">{content}</div> : <p>Bài học này chưa có tài liệu chi tiết. Hãy xem hướng dẫn của giáo viên để bắt đầu nhé.</p>}</div>
      <div className="lesson-actions">
        <button className="lesson-action-button lesson-ai" type="button" onClick={() => setShowGenerator(true)}><img src="/public/img/star.png" alt="" />TẠO BÀI TẬP TỪ AI</button>
        <button className="lesson-action-button lesson-start" type="button" onClick={onComplete}><img src="/public/img/medal.png" alt="" />ĐÃ HỌC XONG BÀI NÀY ✓</button>
      </div>
    </article>
  </section>;
}
