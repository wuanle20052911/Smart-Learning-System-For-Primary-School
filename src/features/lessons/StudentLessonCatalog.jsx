import React from 'react';
import { getLessonDescription, getLessonDisplayTitle } from '../../services/learningMaterials.js';
import { ChapterHeadingIcon, LessonIllustration } from './LessonCatalogIllustrations.jsx';

export default function StudentLessonCatalog({
  chapters,
  selectedChapter,
  loading,
  error,
  completedLessons,
  recentLessons,
  lessonFilter,
  catalogView,
  onLessonFilterChange,
  onCatalogViewChange,
  onSelectChapter,
  onSelectLesson,
  onBackToChapters
}) {
  const recentLessonById = new Map(recentLessons.map((item) => [item.id, item.studiedAt]));
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const matchesFilter = (lesson) => {
    if (lessonFilter === 'completed') return completedLessons.includes(lesson.id);
    if (lessonFilter === 'recent') {
      const studiedAt = recentLessonById.get(lesson.id);
      return studiedAt >= recentCutoff;
    }
    return true;
  };
  const visibleChapters = chapters
    .map((chapter) => ({ ...chapter, lessons: chapter.lessons.filter(matchesFilter) }))
    .filter((chapter) => chapter.lessons.length);
  const lessons = chapters.flatMap((chapter) => chapter.lessons
    .filter(matchesFilter)
    .map((lesson) => ({ ...lesson, chapterName: chapter.name })));
  if (lessonFilter === 'recent') {
    lessons.sort((left, right) => recentLessonById.get(right.id) - recentLessonById.get(left.id));
  }
  const visibleSelectedChapter = selectedChapter
    ? { ...selectedChapter, lessons: selectedChapter.lessons.filter(matchesFilter) }
    : null;
  const showLessonList = catalogView === 'lesson';

  return <>
    <div className="panel-heading">
      <div className="lesson-catalog-heading">
        <div className={`panel-heading-main ${selectedChapter && !showLessonList ? 'chapter-selected-heading' : ''}`}>
          <span className={`panel-heading-icon ${selectedChapter && !showLessonList ? 'is-open-book' : 'is-book-stack'}`}>
            <ChapterHeadingIcon isChapterSelected={Boolean(selectedChapter && !showLessonList)} />
          </span>
          <div>
            <h2>{showLessonList ? 'Chọn bài học' : selectedChapter ? selectedChapter.name : 'Chọn chương học'}</h2>
            <p>{showLessonList ? `${lessons.length} bài học phù hợp` : selectedChapter ? `${visibleSelectedChapter.lessons.length} bài học trong chương` : 'Chọn một chương để xem các bài học đã xuất bản'}</p>
          </div>
        </div>
        <div className="lesson-catalog-controls">
          <label>Hiển thị
            <select value={catalogView} onChange={(event) => onCatalogViewChange(event.target.value)}>
              <option value="chapter">Theo chương</option>
              <option value="lesson">Theo bài</option>
            </select>
          </label>
          <label>Lọc bài
            <select value={lessonFilter} onChange={(event) => onLessonFilterChange(event.target.value)}>
              <option value="all">Tất cả bài học</option>
              <option value="recent">Đã học trong 30 ngày</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </label>
        </div>
      </div>
      {selectedChapter && !showLessonList && <button className="chapter-back" type="button" onClick={onBackToChapters}>← Tất cả chương</button>}
    </div>
    {error && <p className="message error">{error}</p>}
    {loading ? <p className="lesson-empty">Đang tải chương và bài học...</p> : showLessonList
      ? lessons.length ? <div className="lesson-grid">{lessons.map((lesson, index) => {
        const title = getLessonDisplayTitle(lesson);
        return <button className={`lesson ${lesson.color || ['blue', 'yellow', 'green', 'pink'][index % 4]}`} type="button" key={lesson.id} onClick={() => onSelectLesson({ ...lesson, title })}>
          <span className="lesson-illustration"><LessonIllustration title={title} index={index} /></span>
          <span className="lesson-copy"><h3>{title}</h3><small className="lesson-chapter-label">{lesson.chapterName}{lessonFilter === 'recent' ? ` · Đã học ${new Date(recentLessonById.get(lesson.id)).toLocaleDateString('vi-VN')}` : ''}</small>{getLessonDescription(lesson) && <p>{getLessonDescription(lesson)}</p>}</span>
          {completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}
        </button>;
      })}</div> : <p className="lesson-empty">Không tìm thấy bài học theo bộ lọc này.</p>
      : selectedChapter
        ? visibleSelectedChapter.lessons.length ? <div className="lesson-grid">{visibleSelectedChapter.lessons.map((lesson, index) => {
          const title = getLessonDisplayTitle(lesson);
          return <button className={`lesson ${lesson.color || ['blue', 'yellow', 'green', 'pink'][index % 4]}`} type="button" key={lesson.id} onClick={() => onSelectLesson({ ...lesson, title })}>
            <span className="lesson-illustration"><LessonIllustration title={title} index={index} /></span>
            <span className="lesson-copy"><h3>{title}</h3>{getLessonDescription(lesson) && <p>{getLessonDescription(lesson)}</p>}</span>
            {completedLessons.includes(lesson.id) && <span className="lesson-completed" aria-label="Đã học xong">✓</span>}
          </button>;
        })}</div> : <p className="lesson-empty">Không tìm thấy bài học theo bộ lọc này.</p>
      : visibleChapters.length ? <div className="chapter-grid">{visibleChapters.map((chapter, index) => <button className="chapter-card" type="button" key={chapter.id} onClick={() => onSelectChapter(chapter.id)}>
        <span className="chapter-card-icon">{['📘', '🧮', '✏️', '📐'][index % 4]}</span>
        <span className="chapter-card-copy"><small>{chapter.subject || 'Môn học'}</small><strong>{chapter.name}</strong><span>{chapter.lessons.length} bài học</span></span>
        <span className="chapter-card-arrow" aria-hidden="true">›</span>
      </button>)}</div> : <p className="lesson-empty">{lessonFilter === 'all' ? 'Chưa có bài học nào được xuất bản.' : 'Không tìm thấy bài học theo bộ lọc này.'}</p>}
  </>;
}
