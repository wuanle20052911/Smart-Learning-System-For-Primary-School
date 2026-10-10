import React, { useEffect, useState } from 'react';
import { getLessonSourceCode, renderDocxHtml } from '../../services/learningMaterials.js';

function getLessonMaterialEndpoint(lesson) {
  if (lesson.source_path) return `/api/lessons/${lesson.id}/material`;
  const sourceCode = getLessonSourceCode(lesson);
  if (lesson.source_filename && sourceCode) {
    return `/api/lessons/storage-chapters/Chapter${sourceCode.chapterNumber}/file-url?path=${encodeURIComponent(lesson.source_filename)}`;
  }
  return '';
}

export default function LessonView({ lesson, onBack, onComplete, onStudyActivity, AssignedWorkView, api }) {
  if (lesson.isAssignment) return <AssignedWorkView assignment={lesson} onBack={onBack} api={api} />;
  const content = lesson.content?.trim();
  const [practiceQuestions, setPracticeQuestions] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState('');
  const [materialError, setMaterialError] = useState('');
  const [docxHtml, setDocxHtml] = useState('');
  const [docxLoading, setDocxLoading] = useState(false);
  const isDocx = /\.docx$/i.test(lesson.source_filename || lesson.source_path || '');
  const materialEndpoint = getLessonMaterialEndpoint(lesson);
  useEffect(() => {
    if (!isDocx || !materialEndpoint) {
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
        const result = await api(materialEndpoint);
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
  }, [api, isDocx, lesson.id, lesson.source_filename, lesson.source_path, materialEndpoint]);
  const openMaterial = async () => {
    const materialWindow = window.open('about:blank', '_blank');
    try {
      if (!materialEndpoint) throw new Error('Bài học chưa được liên kết với file trong Supabase Storage.');
      const result = await api(materialEndpoint);
      if (!materialWindow) throw new Error('Trình duyệt đang chặn cửa sổ mở tài liệu.');
      materialWindow.opener = null;
      materialWindow.location.href = result.url;
      setMaterialError('');
    } catch (error) {
      materialWindow?.close();
      setMaterialError(error.message || 'Không thể mở tài liệu.');
    }
  };
  const startPractice = async () => {
    setPracticeLoading(true);
    setPracticeError('');
    try {
      const data = await api(`/api/questions/lesson/${encodeURIComponent(lesson.id)}`);
      if (!data.questions?.length) {
        setPracticeError('Bài học này chưa có câu hỏi trong ngân hàng. Hãy nhờ giáo viên lưu câu hỏi cho bài học trước nhé.');
        return;
      }
      setPracticeQuestions(data.questions);
    } catch (error) {
      setPracticeError(error.message || 'Không thể tải câu hỏi luyện tập.');
    } finally {
      setPracticeLoading(false);
    }
  };
  if (practiceQuestions) {
    return <AssignedWorkView
      assignment={{
        title: lesson.title,
        lessonTitle: lesson.title,
        lesson_id: lesson.id,
        grade: lesson.grade || 'Tiểu học',
        chapter: lesson.topic || 'Luyện tập ngân hàng câu hỏi',
        questions: practiceQuestions,
        isPractice: true
      }}
      onBack={() => setPracticeQuestions(null)}
      onStudyActivity={onStudyActivity}
      api={api}
    />;
  }
  return <section className={`home-panel lesson-inline ${lesson.color || 'blue'}`}>
    <div className="panel-heading">
      <div><h2>{lesson.title}</h2><p>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</p></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button>
    </div>
    <article className="lesson-detail">
      <div className="lesson-detail-heading"><span className="lesson-detail-icon">{lesson.icon || '📚'}</span><div><small>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</small><h1>{lesson.title}</h1><p>{lesson.description || 'Cùng khám phá bài học này nhé!'}</p></div></div>
      <div className="lesson-content"><h2>Nội dung bài học</h2>{lesson.source_filename && <p className="lesson-material">📎 Tài liệu: <b>{lesson.source_filename}</b>{materialEndpoint && <button className="lesson-material-open" type="button" onClick={openMaterial}>Mở tài liệu</button>}</p>}{docxLoading && <p className="lesson-material-status">Đang tải nội dung Word...</p>}{materialError && <p className="ai-error">{materialError}</p>}{docxHtml ? <div className="lesson-content-text lesson-docx-content" dangerouslySetInnerHTML={{ __html: docxHtml }} /> : content ? <div className="lesson-content-text">{content}</div> : <p>{docxLoading ? 'Đang đọc tài liệu bài học...' : 'Bài học này chưa có tài liệu chi tiết. Hãy xem hướng dẫn của giáo viên để bắt đầu nhé.'}</p>}</div>
      <div className="lesson-actions">
        <button className="lesson-action-button lesson-start" type="button" onClick={onComplete}><img src="/public/img/medal.png" alt="" />ĐÃ HỌC XONG BÀI NÀY ✓</button>
        <button className="lesson-action-button lesson-ai" type="button" onClick={startPractice} disabled={practiceLoading}><img src="/public/img/star.png" alt="" />{practiceLoading ? 'ĐANG TẢI CÂU HỎI...' : 'LUYỆN TẬP NGAY'}</button>
      </div>
      {practiceError && <p className="ai-error" role="alert">{practiceError}</p>}
    </article>
  </section>;
}
