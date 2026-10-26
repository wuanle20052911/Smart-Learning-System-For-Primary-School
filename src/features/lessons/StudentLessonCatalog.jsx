import React from 'react';
import { getLessonDescription, getLessonDisplayTitle } from '../../services/learningMaterials.js';
import { ChapterHeadingIcon, LessonIllustration } from './LessonCatalogIllustrations.jsx';

export default function StudentLessonCatalog({
  chapters,
  selectedChapter,
  loading,
  error,
  completedLessons,
  onSelectChapter,
  onSelectLesson,
  onBackToChapters
}) {
  return <>
    <div className="panel-heading">
      <div className={`panel-heading-main ${selectedChapter ? 'chapter-selected-heading' : ''}`}>
        <span className={`panel-heading-icon ${selectedChapter ? 'is-open-book' : 'is-book-stack'}`}>
          <ChapterHeadingIcon isChapterSelected={Boolean(selectedChapter)} />
        </span>
        <div>
          <h2>{selectedChapter ? selectedChapter.name : 'Chọn chương học'}</h2>
          <p>{selectedChapter ? `${selectedChapter.lessons.length} bài học trong chương` : 'Chọn một chương để xem các bài học đã xuất bản'}</p>
        </div>
      </div>
      {selectedChapter && <button className="chapter-back" type="button" onClick={onBackToChapters}>← Tất cả chương</button>}
    </div>
    {error && <p className="message error">{error}</p>}
    {loading ? <p className="lesson-empty">Đang tải chương và bài học...</p> : selectedChapter
      ? selectedChapter.lessons.length ? <div className="lesson-grid">{selectedChapter.lessons.map((lesson, index) => {
        const title = getLessonDisplayTitle(lesson);
        return <button className={`lesson ${lesson.color || ['blue', 'yellow', 'green', 'pink'][index % 4]}`} type="button" key={lesson.id} onClick={() => onSelectLesson({ ...lesson, title })}>
          <span className="lesson-illustration"><LessonIllustration title={title} index={index} /></span>
          <span className="lesson-copy"><h3>{title}</h3>{getLessonDescription(lesson) && <p>{getLessonDescription(lesson)}</p>}</span>
          {completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}
        </button>;
      })}</div> : <p className="lesson-empty">Chương này chưa có bài học được xuất bản.</p>
      : chapters.length ? <div className="chapter-grid">{chapters.map((chapter, index) => <button className="chapter-card" type="button" key={chapter.id} onClick={() => onSelectChapter(chapter.id)}>
        <span className="chapter-card-icon">{['📘', '🧮', '✏️', '📐'][index % 4]}</span>
        <span className="chapter-card-copy"><small>{chapter.subject || 'Môn học'}</small><strong>{chapter.name}</strong><span>{chapter.lessons.length} bài học</span></span>
        <span className="chapter-card-arrow" aria-hidden="true">›</span>
      </button>)}</div> : <p className="lesson-empty">Chưa có bài học nào được xuất bản.</p>}
  </>;
}
