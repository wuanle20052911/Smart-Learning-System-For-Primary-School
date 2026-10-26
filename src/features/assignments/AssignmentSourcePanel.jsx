import React from 'react';

export default function AssignmentSourcePanel({
  lessons,
  selectedLessonId,
  questionType,
  questionCount,
  materialName,
  material,
  busy,
  questionTypes,
  getLessonTitle,
  onSelectLesson,
  onQuestionTypeChange,
  onQuestionCountChange,
  onFileChange,
  onMaterialChange,
  onGenerate
}) {
  return <section className="teacher-card studio-source">
    <h3>1. Chọn bài học làm nguồn</h3>
    <label className="lesson-question-source">Bài học
      <select value={selectedLessonId} onChange={(event) => onSelectLesson(event.target.value)} disabled={busy}>
        <option value="">Chọn bài học</option>
        {lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.subject} · {lesson.grade} · {getLessonTitle(lesson)}</option>)}
      </select>
    </label>
    <label className="lesson-question-source">Dạng câu hỏi
      <select value={questionType} disabled={busy} onChange={(event) => onQuestionTypeChange(event.target.value)}>
        {questionTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
    </label>
    <label className="lesson-question-source question-count-control">
      <span className="question-count-heading"><span>Số câu hỏi</span><output>{questionCount} câu</output></span>
      <input type="range" min="1" max="10" step="1" value={questionCount} onChange={(event) => onQuestionCountChange(Number(event.target.value))} disabled={busy} aria-label="Số câu hỏi muốn tạo" />
      <span className="question-count-range" aria-hidden="true"><span>1</span><span>10</span></span>
    </label>
    <label className="material-upload">
      <span>📄</span>
      <b>{materialName || 'Hoặc chọn tài liệu PDF hoặc Word'}</b>
      <small>Hỗ trợ .pdf, .docx, .txt, .md</small>
      <input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={onFileChange} />
    </label>
    <textarea value={material} onChange={(event) => onMaterialChange(event.target.value)} rows="9" placeholder="Nội dung lesson sẽ được nạp tại đây. Cũng có thể dán nội dung bài học." />
    <button className="teacher-create" type="button" onClick={onGenerate} disabled={busy}>{busy ? 'Đang tạo và kiểm tra đáp án...' : '✦ Tạo câu hỏi bằng AI local'}</button>
    <section className="studio-source-note">Giáo viên xem lại nội dung, sửa câu hỏi/đáp án rồi mới xuất bản cho lớp.</section>
  </section>;
}
