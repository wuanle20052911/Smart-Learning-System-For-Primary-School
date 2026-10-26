import React from 'react';

function EditableQuestion({
  item,
  index,
  questionTypes,
  isSaved,
  onUpdate,
  onUpdateOption,
  onUpdateMatchingPair,
  onUpdateMatchingAnswer,
  onRemove,
  onSave
}) {
  return <article className="editable-question">
    <div className="editable-question-head"><b>Câu {index + 1} · {questionTypes.find(([value]) => value === item.type)?.[1]}</b><button type="button" onClick={onRemove}>Xóa</button></div>
    <textarea value={item.question} onChange={(event) => onUpdate('question', event.target.value)} rows="2" />
    {item.type === 'matching' ? item.options.map((pair, pairIndex) => <div className="editable-matching-pair" key={pairIndex}>
      <input aria-label={`Vế trái ${pairIndex + 1}`} value={pair.left} onChange={(event) => onUpdateMatchingPair(pairIndex, 'left', event.target.value)} />
      <input aria-label={`Vế phải ${pairIndex + 1}`} value={pair.right} onChange={(event) => onUpdateMatchingPair(pairIndex, 'right', event.target.value)} />
      <select aria-label={`Đáp án cho vế trái ${pairIndex + 1}`} value={item.answer[pairIndex]} onChange={(event) => onUpdateMatchingAnswer(pairIndex, event.target.value)}>
        {item.options.map((choice, choiceIndex) => <option value={choiceIndex} key={choiceIndex}>{choice.right}</option>)}
      </select>
    </div>) : item.type === 'fill-blank' || item.type === 'short-answer' ? <label className="editable-answer-label">Đáp án<input value={item.answer} onChange={(event) => onUpdate('answer', event.target.value)} /></label> : item.options.map((option, optionIndex) => <label key={optionIndex}>
      <span>{String.fromCharCode(65 + optionIndex)}</span>
      <input value={option} onChange={(event) => onUpdateOption(optionIndex, event.target.value)} />
      <input className="answer-radio" type="radio" checked={item.answer === optionIndex} onChange={() => onUpdate('answer', optionIndex)} />
    </label>)}
    <input value={item.explanation || ''} onChange={(event) => onUpdate('explanation', event.target.value)} placeholder="Giải thích đáp án (không bắt buộc)" />
    <button className="secondary-studio" type="button" onClick={onSave} disabled={isSaved}>{isSaved ? '✓ Đã lưu ngân hàng' : '＋ Lưu vào ngân hàng câu hỏi'}</button>
  </article>;
}

export default function AssignmentQuestionReview({
  title,
  classId,
  classes,
  dueAt,
  questions,
  savedQuestionIndexes,
  questionTypes,
  busy,
  published,
  onTitleChange,
  onClassChange,
  onDueAtChange,
  onUpdateQuestion,
  onUpdateOption,
  onUpdateMatchingPair,
  onUpdateMatchingAnswer,
  onRemoveQuestion,
  onSaveQuestion,
  onAddQuestion,
  onPublish
}) {
  return <section className="teacher-card studio-review">
    <div className="studio-review-head">
      <div className="studio-review-title"><h3>2. Kiểm tra và chỉnh sửa</h3><small>{questions.length ? `${questions.length} câu hỏi đã tạo` : 'Chưa có câu hỏi'}</small></div>
      <div className="studio-assignment-fields">
        <label>Tên bài tập<input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Nhập tên bài tập" /></label>
        <label>Lớp được giao<select value={classId} onChange={(event) => onClassChange(event.target.value)}><option value="">Chọn lớp</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.grade}</option>)}</select></label>
        <label className="assignment-deadline">Hạn nộp<input type="datetime-local" value={dueAt} onChange={(event) => onDueAtChange(event.target.value)} /><small>Để trống nếu không đặt hạn.</small></label>
      </div>
    </div>
    {questions.length ? questions.map((item, index) => <EditableQuestion
      key={index}
      item={item}
      index={index}
      questionTypes={questionTypes}
      isSaved={savedQuestionIndexes.includes(index)}
      onUpdate={(key, value) => onUpdateQuestion(index, key, value)}
      onUpdateOption={(optionIndex, value) => onUpdateOption(index, optionIndex, value)}
      onUpdateMatchingPair={(pairIndex, key, value) => onUpdateMatchingPair(index, pairIndex, key, value)}
      onUpdateMatchingAnswer={(pairIndex, value) => onUpdateMatchingAnswer(index, pairIndex, value)}
      onRemove={() => onRemoveQuestion(index)}
      onSave={() => onSaveQuestion(item, index)}
    />) : <div className="studio-empty">Câu hỏi AI tạo ra sẽ xuất hiện ở đây để giáo viên kiểm tra.</div>}
    <div className="studio-actions">
      <button className="secondary-studio" type="button" onClick={onAddQuestion}>+ Thêm câu hỏi</button>
      <button className="teacher-create" type="button" onClick={onPublish} disabled={busy || published}>{published ? '✓ Đã xuất bản' : 'Xuất bản cho cả lớp'}</button>
    </div>
  </section>;
}
