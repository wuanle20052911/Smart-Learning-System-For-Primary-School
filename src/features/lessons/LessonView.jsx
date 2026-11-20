import React, { useEffect, useState } from 'react';
import { getLessonDescription } from '../../services/learningMaterials.js';
import { getLessonSourceCode, renderDocxHtml } from '../../services/learningMaterials.js';
import StudyAdventure from './StudyAdventure.jsx';

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
  const [adventure, setAdventure] = useState(null);
  const [adventureLoading, setAdventureLoading] = useState(false);
  const [adventureError, setAdventureError] = useState('');
  const [materialError, setMaterialError] = useState('');
  const [docxHtml, setDocxHtml] = useState('');
  const [docxLoading, setDocxLoading] = useState(false);
  const [storySlides, setStorySlides] = useState([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState('');
  const [readingLesson, setReadingLesson] = useState(!lesson.story_slides?.length);
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
  useEffect(() => {
    let active = true;
    setStorySlides([]);
    setStoryIndex(0);
    setReadingLesson(!lesson.story_slides?.length);
    setStoryError('');
    if (!lesson.story_slides?.length) {
      setStoryLoading(false);
      return () => { active = false; };
    }
    setStoryLoading(true);
    api(`/api/lessons/${lesson.id}/story-images`)
      .then((data) => {
        if (active) setStorySlides(data.slides || []);
      })
      .catch((error) => {
        if (active) setStoryError(error.message || 'Không thể tải câu chuyện ảnh.');
      })
      .finally(() => {
        if (active) setStoryLoading(false);
      });
    return () => { active = false; };
  }, [api, lesson.id, lesson.story_slides]);
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
  const startAdventure = async () => {
    setAdventureLoading(true);
    setAdventureError('');
    try {
      const data = await api('/api/generate-story-adventure', {
        method: 'POST',
        body: JSON.stringify({ lessonId: lesson.id })
      });
      const storyPanels = data.adventure?.story?.panels;
      const hasCharacterDialogue = Array.isArray(storyPanels) && storyPanels.every((panel) => (
        panel.boardText
        && Array.isArray(panel.dialogue)
        && panel.dialogue.some((line) => line.role === 'curious')
        && panel.dialogue.some((line) => line.role === 'explainer')
      ));
      if (!hasCharacterDialogue || !data.adventure?.game?.challenges?.length) {
        throw new Error('Máy chủ đang trả truyện theo phiên bản cũ hoặc nội dung chưa có nhân vật. Hãy khởi động lại server rồi tải lại trang.');
      }
      setAdventure(data.adventure);
    } catch (error) {
      setAdventureError(error.message || 'Không thể tạo truyện và minigame lúc này.');
    } finally {
      setAdventureLoading(false);
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
  if (adventure) {
    return <StudyAdventure
      adventure={adventure}
      lessonTitle={lesson.title}
      onBack={() => setAdventure(null)}
      onStudyActivity={onStudyActivity}
    />;
  }
  return <section className={`home-panel lesson-inline ${lesson.color || 'blue'}`}>
    <div className="panel-heading">
      <div><h2>{lesson.title}</h2><p>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</p></div>
      <button className="lesson-close" type="button" onClick={onBack}>← Quay lại</button>
    </div>
    {!readingLesson && <section className="lesson-story-view" aria-label="Câu chuyện mở đầu bài học">
      <div className="lesson-story-view-heading"><span>📖</span><div><small>TRƯỚC KHI VÀO BÀI</small><h2>Cùng xem câu chuyện nhé!</h2></div></div>
      {storyLoading ? <p className="lesson-story-status">Đang tải câu chuyện...</p> : storyError ? <p className="ai-error" role="alert">{storyError}</p> : storySlides.length ? <>
        <div className="lesson-story-frame"><img src={storySlides[storyIndex]?.url} alt={storySlides[storyIndex]?.caption || `Ảnh ${storyIndex + 1}`} />{storySlides[storyIndex]?.caption && <p>{storySlides[storyIndex].caption}</p>}</div>
        <div className="lesson-story-controls"><button type="button" onClick={() => setStoryIndex((current) => Math.max(0, current - 1))} disabled={storyIndex === 0}>← Trước</button><span>Ảnh {storyIndex + 1} / {storySlides.length}</span><button type="button" onClick={() => setStoryIndex((current) => Math.min(storySlides.length - 1, current + 1))} disabled={storyIndex === storySlides.length - 1}>Tiếp →</button></div>
        <div className="lesson-story-dots" aria-label="Chọn ảnh"><span>{storySlides.map((slide, index) => <button key={`${slide.path}-${index}`} type="button" className={index === storyIndex ? 'active' : ''} aria-label={`Xem ảnh ${index + 1}`} aria-current={index === storyIndex ? 'step' : undefined} onClick={() => setStoryIndex(index)} />)}</span></div>
      </> : !storyLoading && <p className="lesson-story-status">Câu chuyện chưa có ảnh để hiển thị.</p>}
      <button className="lesson-story-start" type="button" disabled={storyLoading} onClick={() => setReadingLesson(true)}>Bắt đầu đọc bài học →</button>
    </section>}
    {readingLesson && lesson.story_slides?.length > 0 && <button className="lesson-story-reopen" type="button" onClick={() => setReadingLesson(false)}>← Xem lại câu chuyện ảnh</button>}
    {readingLesson && <article className="lesson-detail">
      <div className="lesson-detail-heading"><div><small>{lesson.subject || 'Toán'} · {lesson.grade || 'Tiểu học'}</small><h1>{lesson.title}</h1>{getLessonDescription(lesson) && <p>{getLessonDescription(lesson)}</p>}</div></div>
      <div className="lesson-content"><h2>Nội dung bài học</h2>{lesson.source_filename && <p className="lesson-material">📎 Tài liệu: <b>{lesson.source_filename}</b>{materialEndpoint && <button className="lesson-material-open" type="button" onClick={openMaterial}>Mở tài liệu</button>}</p>}{docxLoading && <p className="lesson-material-status">Đang tải nội dung Word...</p>}{materialError && <p className="ai-error">{materialError}</p>}{docxHtml ? <div className="lesson-content-text lesson-docx-content" dangerouslySetInnerHTML={{ __html: docxHtml }} /> : content ? <div className="lesson-content-text">{content}</div> : <p>{docxLoading ? 'Đang đọc tài liệu bài học...' : 'Bài học này chưa có tài liệu chi tiết. Hãy xem hướng dẫn của giáo viên để bắt đầu nhé.'}</p>}</div>
      <div className="lesson-actions">
        <button className="lesson-action-button lesson-start" type="button" onClick={onComplete}><img src="/public/img/medal.png" alt="" />ĐÃ HỌC XONG BÀI NÀY ✓</button>
        <button className="lesson-action-button lesson-ai" type="button" onClick={startPractice} disabled={practiceLoading}><img src="/public/img/star.png" alt="" />{practiceLoading ? 'ĐANG TẢI CÂU HỎI...' : 'LUYỆN TẬP NGAY'}</button>
        <button className="lesson-action-button lesson-adventure" type="button" onClick={startAdventure} disabled={adventureLoading}><img src="/public/img/star.png" alt="" />{adventureLoading ? 'ĐANG DỰNG TRUYỆN...' : 'TRUYỆN & MINIGAME AI'}</button>
      </div>
      {adventureLoading && <p className="adventure-loading-message" role="status">AI đang tạo truyện và kiểm tra thử thách. Có thể mất vài phút trên máy chạy Ollama.</p>}
      {practiceError && <p className="ai-error" role="alert">{practiceError}</p>}
      {adventureError && <p className="ai-error" role="alert">{adventureError}</p>}
    </article>
    }
  </section>;
}
